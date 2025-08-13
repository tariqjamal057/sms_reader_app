declare module 'react-native-get-sms-android' {
  export interface SMSFilter {
    box?: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued' | 'undelivered';
    maxCount?: number;
    threadId?: number;
    address?: string;
    body?: string;
    dateFrom?: number;
    dateTo?: number;
    read?: 0 | 1;
    seen?: 0 | 1;
  }

  export interface SMSMessage {
    _id: number;
    thread_id: number;
    address: string;
    person: number;
    date: number;
    date_sent: number;
    protocol: number;
    read: number;
    status: number;
    type: number;
    reply_path_present: number;
    subject: string;
    body: string;
    service_center: string;
    locked: number;
    sub_id: number;
    error_code: number;
    creator: string;
    seen: number;
  }

  interface SmsAndroidStatic {
    list: (
      filter: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ) => void;
    
    autoSend: (
      phoneNumber: string,
      message: string,
      failCallback: (error: string) => void,
      successCallback: (message: string) => void
    ) => void;
    
    delete: (
      id: number,
      failCallback: (error: string) => void,
      successCallback: (count: number) => void
    ) => void;
  }

  const SmsAndroid: SmsAndroidStatic;
  export default SmsAndroid;
}
