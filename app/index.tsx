import React, { useState } from 'react';
import { View, Button, Alert, Text } from 'react-native';
import SmsRetriever from 'react-native-sms-retriever';

export default function HomeScreen() {
  const [otp, setOtp] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const startListening = async () => {
    try {
      setListening(true);
      const registered = await SmsRetriever.startSmsRetriever();
      if (registered) {
        SmsRetriever.addSmsListener(event => {
          const message = event?.message;
          if (!message) return;

          console.log("SMS Received:", message);

          if (message.includes("SSMMS") && message.includes("TSMDCL")) {
            const match = message.match(/\b[A-Za-z0-9]{6}\b/);
            if (match) {
              const otpValue = match[0];
              setOtp(otpValue);
              sendOtpToServer(otpValue);
              Alert.alert("OTP Received", otpValue);
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
      setListening(false);
    }
  };

  const stopListening = () => {
    SmsRetriever.removeSmsListener();
    setListening(false);
    Alert.alert("Stopped Listening");
  };

  const sendOtpToServer = async (otpValue: string) => {
    try {
      const res = await fetch("https://your-backend.com/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpValue }),
      });
      console.log("Server Response:", await res.text());
    } catch (err) {
      console.error("Error sending OTP:", err);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button title="Start Listening" onPress={startListening} disabled={listening} />
      <View style={{ height: 20 }} />
      <Button title="Stop Listening" onPress={stopListening} disabled={!listening} />
      {otp && <Text style={{ marginTop: 20, fontSize: 18 }}>Detected OTP: {otp}</Text>}
    </View>
  );
}
