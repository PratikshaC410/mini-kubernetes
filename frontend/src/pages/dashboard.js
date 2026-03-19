import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";
const API = process.env.REACT_APP_BACKEND_BASEURL;
const Dashboard = () => {
  const { token, logoutuser } = useAuth();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [containerPort, setContainerPort] = useState("");

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`${API}/api/auth/deployments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDeployments(data);
      } else {
        toast(data.message || "Failed to fetch deployments");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/auth/deployments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          image,
          replicas,
          containerPort: Number(containerPort),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast("Deployment created!");
        setName("");
        setImage("");
        setReplicas(1);
        setContainerPort("");
        setShowForm(false);
        fetchDeployments();
      } else {
        toast(data.message || "Failed to create deployment");
      }
    } catch (err) {
      console.error(err);
      toast("error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/auth/deployments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        toast("Deployment deleted");
        fetchDeployments();
      } else {
        toast(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast(" error");
    }
  };

  const handleScale = async (id, currentReplicas, direction) => {
    const newReplicas =
      direction === "up"
        ? currentReplicas + 1
        : Math.max(1, currentReplicas - 1);

    try {
      const res = await fetch(`${API}/api/auth/deployments/${id}/scale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replicas: newReplicas }),
      });

      const data = await res.json();

      if (res.ok) {
        toast(`Scaled to ${newReplicas} replicas`);
        fetchDeployments();
      } else {
        toast(data.message || "Failed to scale");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    }
  };

  const handleLogout = () => {
    logoutuser();
    navigate("/");
  };

  return (
    <div>
      <div>
        <h2>Mini Kubernetes</h2>
        <div>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Deployment"}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {showForm && (
        <div>
          <h3>Create Deployment</h3>
          <form onSubmit={handleCreate}>
            <div>
              <label>Deployment Name:</label>
              <input
                type="text"
                placeholder="e.g. my-app"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Docker Image:</label>
              <input
                type="text"
                placeholder="e.g. nginx:latest"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Replicas:</label>
              <input
                type="number"
                min={1}
                value={replicas}
                onChange={(e) => setReplicas(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label>Container Port:</label>
              <input
                type="number"
                placeholder="e.g. 80"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                required
              />
            </div>

            <button type="submit">Deploy</button>
          </form>
        </div>
      )}

      <div className="deployments">
        <h3>Your Deployments</h3>

        {loading ? (
          <p>Loading...</p>
        ) : deployments.length === 0 ? (
          <p>
            No deployments yet. Click "+ New Deployment" to create your first
            deployment.
          </p>
        ) : (
          deployments.map((dep) => (
            <div key={dep._id}>
              <div>
                <h4>{dep.name}</h4>
                <p>{dep.image}</p>
                <span>{dep.status}</span>
              </div>

              <div>
                <div>
                  <button
                    onClick={() => handleScale(dep._id, dep.replicas, "down")}
                  >
                    −
                  </button>
                  <span>{dep.replicas} replicas</span>
                  <button
                    onClick={() => handleScale(dep._id, dep.replicas, "up")}
                  >
                    +
                  </button>
                </div>
                <button onClick={() => handleDelete(dep._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
