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
  const container = docker.getContainer(containerId);
  return await container.inspect();
}

module.exports = {
  createContainer,
  stopContainer,
  removeContainer,
  inspectContainer,
};
