import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  PermissionsAndroid,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import SmsAndroid from "react-native-get-sms-android";

export default function HomeScreen() {
  const [listening, setListening] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNumberSet, setIsNumberSet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const [currentOTP, setCurrentOTP] = useState("");
  const [currentOTPMessage, setCurrentOTPMessage] = useState("");

  useEffect(() => {
    (async () => {
      const savedNumber = await AsyncStorage.getItem("phone_number");

      if (savedNumber) {
        setPhoneNumber(savedNumber);
        setIsNumberSet(true);
      }
    })();
  }, []);

  const savePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Validation Error", "Please enter a phone number.");
      return;
    }
    await AsyncStorage.setItem("phone_number", phoneNumber.trim());
    setIsNumberSet(true);
    setIsEditing(false);
  };

  async function requestSMSPermission(): Promise<boolean> {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "SMS Permission",
          message: "This app needs access to your SMS to read OTP codes.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.log("Permission error:", error);
      return false;
    }
  }

  const fetchLatestSMS = () => {
    SmsAndroid.list(
      JSON.stringify({
        box: "inbox",
        maxCount: 10,
      }),
      (fail) => {
        console.log("SMS fetch failed:", fail);
      },
      async (count, smsList) => {
        const messages = JSON.parse(smsList);
        if (messages.length > 0) {
          const latestMsg = messages[0];
          const latestBody = latestMsg.body;
          console.log("Latest SMS:", latestBody);

          let match = null;

          // Pattern 1: "D2C6 is your One Time Password for SSMMS Login - TSMDCL"
          const pattern1 = /([A-Z0-9]{4,6})\s+is\s+your\s+One\s+Time\s+Password.*SSMMS.*TSMDCL/i;
          
          // Pattern 2: "Use OTP 19D145 for SSMMS Login - TSMDCL"
          const pattern2 = /Use\s+OTP\s+([A-Z0-9]{4,6})\s+for\s+SSMMS.*TSMDCL/i;
          
          // Pattern 3: "7CF3 is your One Time Password for SSMMS Login - TSMDCL"
          const pattern3 = /([A-Z0-9]{4,6})\s+is\s+your\s+One\s+Time\s+Password.*SSMMS.*TSMDCL/i;
          
          // Pattern 4: "Your One Time Password is 9DBC for SSMMS Login - TSMDCL"
          const pattern4 = /Your\s+One\s+Time\s+Password\s+is\s+([A-Z0-9]{4,6})\s+for\s+SSMMS.*TSMDCL/i;
          
          // Pattern 5: "Your One Time Password is 2F2E for SSMMS Login - TSMDCL"
          const pattern5 = /Your\s+One\s+Time\s+Password\s+is\s+([A-Z0-9]{4,6})\s+for\s+SSMMS.*TSMDCL/i;
          
          // Pattern 6: "Your SSMMS Login OTP 54CB74 - TSMDCL"
          const pattern6 = /SSMMS.*OTP\s+([A-Z0-9]{4,6}).*TSMDCL/i;
          
          // General fallback pattern
          const pattern7 = /SSMMS.*([A-Z0-9]{4,6}).*TSMDCL/i;

          if (pattern1.test(latestBody)) {
            match = latestBody.match(pattern1);
          } else if (pattern2.test(latestBody)) {
            match = latestBody.match(pattern2);
          } else if (pattern3.test(latestBody)) {
            match = latestBody.match(pattern3);
          } else if (pattern4.test(latestBody)) {
            match = latestBody.match(pattern4);
          } else if (pattern5.test(latestBody)) {
            match = latestBody.match(pattern5);
          } else if (pattern6.test(latestBody)) {
            match = latestBody.match(pattern6);
          } else if (pattern7.test(latestBody)) {
            match = latestBody.match(pattern7);
          }

          if (match) {
            const otp = match[1];
            console.log("OTP detected:", otp);
            sendOtpToServer(otp);
          }
        }
      }
    );
  };

  const sendOtpToServer = async (otpValue: string) => {
    try {
      setCurrentOTPMessage("Checking recived OTP " + otpValue);
      const res = await fetch(
        "https://bhaktabhim.duckdns.org/otp/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: phoneNumber,
            otp_secret: otpValue,
          }),
        }
      );
      const data = await res.json();
      console.log("Response Data ", data);
      setCurrentOTP(otpValue);
      console.log("Server response:", await res.text());
    } catch (err) {
      setCurrentOTPMessage("Error sending OTP to server " + err);
      console.error("Error sending OTP:", err);
    }
  };

  const startListening = async () => {
    const hasPermission = await requestSMSPermission();
    if (!hasPermission) {
      Alert.alert(
        "Permission Required",
        "Please allow SMS reading permission."
      );
      return;
    }
    if (!listening) {
      setListening(true);
      intervalRef.current = setInterval(fetchLatestSMS, 5000);
      console.log("Started Listening...");
    }
  };

  const stopListening = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setListening(false);
    console.log("Stopped Listening...");
  };

  return (
    <View style={styles.container}>
      {!isNumberSet || isEditing ? (
        <>
          <Text style={styles.label}>Enter Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="Enter phone number"
          />
          <Button title="Save Number" onPress={savePhoneNumber} />
        </>
      ) : (
        <>
          <Text style={styles.savedNumber}>Phone Number: {phoneNumber}</Text>
          <Button title="Edit Number" onPress={() => setIsEditing(true)} />
          <View style={{ height: 20 }} />
          <Button
            title="Start Listening"
            onPress={startListening}
            disabled={listening}
          />
          <View style={{ height: 20 }} />
          <Button
            title="Stop Listening"
            onPress={stopListening}
            disabled={!listening}
          />
          <Text style={{ marginTop: 20 }}>
            Status: {listening ? "Listening..." : "Stopped"}
          </Text>
          {
            currentOTPMessage && (
              <Text style={{ marginTop: 20 }}>{currentOTPMessage}</Text>
            )
          }
          {currentOTP && (
            <Text style={{ marginTop: 20 }}>Latest OTP: {currentOTP}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  label: { fontSize: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  savedNumber: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
});
