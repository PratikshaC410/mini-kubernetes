import { createContext, useContext, useState } from "react";

export const AuthContext = createContext();
const API = process.env.REACT_APP_BACKEND_BASEURL;

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const store_token_ls = (serverToken) => {
    localStorage.setItem("token", serverToken);
    setToken(serverToken);
  };

  const logoutuser = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  const isloggedin = !!token;

  return (
    <AuthContext.Provider
      value={{ token, store_token_ls, logoutuser, isloggedin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
