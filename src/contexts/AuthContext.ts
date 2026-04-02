import { createContext } from "react";

export const AuthContext = createContext<{
  isSignedIn: boolean;
  setIsSignedIn: (value: boolean) => void;
}>({
  isSignedIn: false,
  setIsSignedIn: () => {},
});
