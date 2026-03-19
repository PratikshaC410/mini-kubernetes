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
        <p>
          Mini Kubernetes lets you deploy Docker containers, scale replicas, and
          watch self-healing happen in real time.
        </p>

        <div>
          <div>
            <h3>Deploy Apps</h3>
            <p>deploy apps with ease</p>
          </div>
          <div>
            <h3>Scale Instantly</h3>
            <p>Increase or decrease replicas with a single click.</p>
          </div>
          <div>
            <h3>Self Healing</h3>
            <p>Crashed containers are automatically recreated.</p>
          </div>
        </div>

        <button onClick={handleCreateClick}>Create Deployment</button>
      </div>
    </div>
  );
};

export default Home;
