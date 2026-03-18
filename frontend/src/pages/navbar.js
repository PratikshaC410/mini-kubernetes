import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <div className="nav-div">
        <Link to="/" className="navbar">
          Home
        </Link>

        <Link to="/login" className="navbar">
          Login
        </Link>

        <Link to="/register" className="navbar">
          Register
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
