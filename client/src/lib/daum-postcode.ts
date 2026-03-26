export interface DaumPostcodeResult {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
      }) => { open: () => void };
    };
  }
}
