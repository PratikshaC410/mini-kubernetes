import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";
const API = process.env.REACT_APP_BACKEND_BASEURL;
const Login = () => {
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const navigate = useNavigate();
  const { store_token_ls } = useAuth();

  const handlesubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const res_data = await res.json();

      if (res.ok) {
        store_token_ls(res_data.token);
        toast("Login successful");
        navigate("/dashboard");
      } else {
        toast(res_data.msg || "Login failed");
      }
    } catch (err) {
      console.error(err);
      toast("Server error. Try again.");
    }
  };

  return (
    <div className="login-div">
      <div className="login-left"></div>

      <div className="login-right">
        <h1 className="heading">Login</h1>

        <form onSubmit={handlesubmit}>
          <div>
            <label>Email:</label>
            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setemail(e.target.value)}
              required
            />
          </div>

          <div>
            <label>Password:</label>
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setpassword(e.target.value)}
              required
            />
          </div>

          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
