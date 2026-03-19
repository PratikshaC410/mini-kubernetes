import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
const API = process.env.REACT_APP_BACKEND_BASEURL;

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(300);

  const navigate = useNavigate();

  const time_in_min = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  useEffect(() => {
    let interval = null;
    if (showOtpPopup && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showOtpPopup, timer]);

  const handleRegisterClick = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const res_data = await response.json();

      if (response.ok) {
        toast(res_data.msg || "Registration successful. OTP sent!");
        setShowOtpPopup(true);
        setTimer(300);
      } else {
        toast(res_data.msg || "Registration failed");
      }
    } catch (error) {
      console.error(error);
      toast("Registration failed");
    }
  };

  const handleOtpSubmit = async () => {
    try {
      const respond = await fetch(`${API}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await respond.json();

      if (respond.ok) {
        toast("Email verified! Please login.");
        navigate("/login");
      } else {
        toast(data.msg || "Invalid OTP");
      }
    } catch (error) {
      console.error("Error:", error);
      toast("OTP verification failed");
    }
  };

  const handlepopclose = () => {
    setShowOtpPopup(false);
    setOtp("");
    setTimer(300);
  };

  return (
    <div className="register-div">
      <div className="register-left"></div>

      <div className="register-right">
        <h1 className="heading">Register</h1>

        <form onSubmit={handleRegisterClick}>
          <div className="username">
            <label>Username: </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="email">
            <label>Email: </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="pass">
            <label>Password: </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit">Register</button>
        </form>

        {showOtpPopup && (
          <div className="otp">
            <h2>Enter OTP</h2>
            <p>Time remaining: {time_in_min(timer)}</p>

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <button
              onClick={() => {
                if (otp.length) handleOtpSubmit();
                else toast("OTP cannot be empty");
              }}
              disabled={timer === 0}
            >
              Verify OTP
            </button>

            <button onClick={handlepopclose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
