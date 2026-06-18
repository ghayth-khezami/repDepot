interface GoogleIdCredentialResponse {
  credential?: string;
}

interface GoogleIdInitializeOptions {
  client_id: string;
  callback: (response: GoogleIdCredentialResponse) => void;
}

interface GoogleIdRenderButtonOptions {
  type?: "standard" | "icon";
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  shape?: "rectangular" | "pill" | "circle" | "square";
  width?: number;
}

interface GoogleAccountsId {
  initialize: (options: GoogleIdInitializeOptions) => void;
  renderButton: (parent: HTMLElement, options: GoogleIdRenderButtonOptions) => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

interface Window {
  google?: {
    accounts?: GoogleAccounts;
  };
}
