import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  Button,
  Alert,
  Text,
  Platform,
  PermissionsAndroid,
} from "react-native";
import SmsRetriever from "react-native-sms-retriever";

export default function HomeScreen() {
  const [otp, setOtp] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [smsPermission, setSmsPermission] = useState(false);

  useEffect(() => {
    checkSmsPermissions();
  }, []);

  const checkSmsPermissions = async () => {
    if (Platform.OS === "android") {
      const hasReceive = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
      );
      const hasRead = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      setSmsPermission(hasReceive && hasRead);
    }
  };

  const requestSmsPermissions = async () => {
    if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ]);

      const receiveSmsGranted =
        granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const readSmsGranted =
        granted[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;
      console.log(receiveSmsGranted);
      console.log(readSmsGranted);
      setSmsPermission(receiveSmsGranted && readSmsGranted);
      return receiveSmsGranted && readSmsGranted;
    }
    return false;
  };

  const startListening = async () => {
    try {
      if (!smsPermission) {
        const granted = await requestSmsPermissions();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "SMS permissions are required to read OTP messages."
          );
          return;
        }
      }

      SmsRetriever.removeSmsListener();

      console.log("Starting SMS listener...");
      setListening(true);

      const registered = await SmsRetriever.startSmsRetriever();
      console.log("SMS Retriever registered:", registered);

      if (registered) {
        SmsRetriever.addSmsListener((event) => {
          console.log("SMS Event received:", event);

          if (event && event.message) {
            const message = event.message;
            console.log("SMS Message:", message);

            const otpMatch = message.match(
              /(?:OTP|code|password)\s*[:=]?\s*([A-Za-z0-9]{6})/i
            );
            const sandBookingMatch = message.match(
              /SSMMS.*TSMDCL.*([A-Za-z0-9]{6})/i
            );

            let extractedOtp = null;

            if (sandBookingMatch) {
              extractedOtp = sandBookingMatch[1];
            } else if (otpMatch) {
              extractedOtp = otpMatch[1];
            }

            if (extractedOtp) {
              setOtp(extractedOtp);
              Alert.alert("OTP Detected", `OTP: ${extractedOtp}`);
              sendOtpToServer(extractedOtp);

              stopListening();
            }
          }
        });

        Alert.alert("Success", "SMS listener started successfully");
      } else {
        Alert.alert(
          "SMS Listener Failed",
          "Could not start SMS listener. This might be due to:\n1. Missing SMS permissions\n2. App hash not configured\n3. SMS retriever not available"
        );
        setListening(false);
      }
    } catch (error) {
      console.error("Error starting SMS listener:", error);
      Alert.alert("Error", "Failed to start SMS listener");
      setListening(false);
    }
  };

  const stopListening = () => {
    try {
      SmsRetriever.removeSmsListener();
      setListening(false);
      console.log("SMS listener stopped");
    } catch (error) {
      console.error("Error stopping listener:", error);
    }
  };

  const sendOtpToServer = async (otpValue: string) => {
    try {
      const res = await fetch("https://your-backend.com/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue }),
      });
      const response = await res.text();
      console.log("Server Response:", response);
      Alert.alert("Success", "OTP sent to server");
    } catch (err) {
      console.error("Error sending OTP:", err);
      Alert.alert("Error", "Failed to send OTP to server");
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        SMS Permission: {smsPermission ? "Granted" : "Required"}
      </Text>

      <Button
        title={listening ? "Listening for SMS..." : "Start Listening"}
        onPress={startListening}
        disabled={listening}
      />

      <Text style={{ height: 20 }} />

      <Button
        title="Stop Listening"
        onPress={stopListening}
        disabled={!listening}
      />

      {otp && (
        <Text style={{ marginTop: 20, fontSize: 18, fontWeight: "bold" }}>
          Detected OTP: {otp}
        </Text>
      )}
    </SafeAreaView>
  );
}
