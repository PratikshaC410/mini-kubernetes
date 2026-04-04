import { Link } from "react-router-dom";
import { useAuth } from "./auth";
const Navbar = () => {
  const { isloggedin } = useAuth();
  return (
    <nav>
      <div>
        <Link to="/">Home</Link>
        {isloggedin ? (
          <>
            {" "}
            <Link to="/dashboard">Dashboard</Link>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>

            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
