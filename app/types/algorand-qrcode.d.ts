declare module 'algorand-qrcode' {
  function AlgorandQRCode(data: string, options?: {
    size?: number;
    type?: string;
  }): Promise<string>;
  
  export = AlgorandQRCode;
}
