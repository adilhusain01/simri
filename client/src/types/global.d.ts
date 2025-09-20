declare global {
  interface Window {
    Razorpay: any;
  }
  
  namespace NodeJS {
    interface Timeout {}
  }
}

export {};