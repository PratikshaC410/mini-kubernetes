const Docker = require("dockerode");

const docker = new Docker();

async function createContainer(image, port) {
  await docker.pull(image);

  const container = await docker.createContainer({
    Image: image,
    ExposedPorts: {
      [`${port}/tcp`]: {},
    },
    HostConfig: {
      PortBindings: {
        [`${port}/tcp`]: [{ HostPort: "" }],
      },
    },
  });

  await container.start();

  return container;
}

async function stopContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
  } catch (err) {
    console.log(`Container already stopped: ${containerId}`);
  }
}

async function removeContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.remove();
  } catch (err) {
    console.log(`Container already removed: ${containerId}`);
  }
}
async function inspectContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    return await container.inspect();
  } catch (err) {
    return null;
  }
}
async function getContainerLogs(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 50,
      timestamps: true,
    });

    const clean = logs
      .toString("utf8")
      .split("\n")
      .map((line) => (line.length > 8 ? line.slice(8) : line))
      .join("\n")
      .trim();

    return clean || "No logs available";
  } catch (err) {
    return "Could not retrieve logs";
  }
}

module.exports = {
  createContainer,
  stopContainer,
  removeContainer,
  inspectContainer,
  getContainerLogs,
};
