import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

const Home = () => {
  const { isloggedin } = useAuth();
  const navigate = useNavigate();

  const handleCreateClick = () => {
    if (isloggedin) {
      navigate("/dashboard");
    } else {
      navigate("/register");
    }
  };

  return (
    <div>
      <h2>Mini Kubernetes</h2>

      <div>
        <h1>Deploy and manage your containers</h1>

        <button onClick={handleCreateClick}>Create Deployment</button>
      </div>
    </div>
  );
};

export default Home;
