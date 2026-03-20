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
  const container = docker.getContainer(containerId);
  await container.stop();
}

async function removeContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.remove();
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
    return logs.toString("utf8");
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
