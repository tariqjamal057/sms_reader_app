import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Button,
  PermissionsAndroid,
  Alert,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SmsAndroid from "react-native-get-sms-android";

export default function HomeScreen() {
  const [listening, setListening] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isNumberSet, setIsNumberSet] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);

  // Load saved phone number & last OTP cache on app start
  useEffect(() => {
    (async () => {
      const savedNumber = await AsyncStorage.getItem("phone_number");

      if (savedNumber) {
        setPhoneNumber(savedNumber);
        setIsNumberSet(true);
      }
    })();
  }, []);

  // Save phone number to storage
  const savePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Validation Error", "Please enter a phone number.");
      return;
    }
    await AsyncStorage.setItem("phone_number", phoneNumber.trim());
    setIsNumberSet(true);
    setIsEditing(false);
  };

  // Request SMS Read Permission
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

  // Fetch latest SMS and check OTP format
  const fetchLatestSMS = () => {
    SmsAndroid.list(
      JSON.stringify({
        box: "inbox",
        maxCount: 1,
      }),
      (fail) => {
        console.log("SMS fetch failed:", fail);
      },
      async (count, smsList) => {
        const messages = JSON.parse(smsList);
        if (messages.length > 0) {
          const latestMsg = messages[0];
          const latestMsgId = latestMsg._id;
          const latestBody = latestMsg.body;

          const match = latestBody.match(
            /SSMMS.*([A-Za-z0-9]{6}).*TSMDCL/
          );
          console.log(match);

          if (match) {
            const otp = match[1];
            console.log("OTP detected:", otp);
            sendOtpToServer(otp);
          }
        }
      }
    );
  };

  // Send OTP to backend
  const sendOtpToServer = async (otpValue: string) => {
    try {
      const res = await fetch(
        "https://telangana-sand-booking-backend.onrender.com/otp/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: phoneNumber,
            otp_secret: otpValue,
          }),
        }
      );
      console.log("Server response:", await res.text());
    } catch (err) {
      console.error("Error sending OTP:", err);
    }
  };

  // Start listening for OTP (poll inbox every 5s)
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

  // Stop listening
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
