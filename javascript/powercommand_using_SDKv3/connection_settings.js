const keychain = require('keychain');

const tokenKeychainSettings = {
  service: 'asana-power cli access-token',
  account: 'default',
};

const projectKeychainSettings = {
  service: 'asana-power cli project-id',
  account: 'default',
};

const getToken = function(tokenInput, shouldSave) {
  if (tokenInput) {
    console.log('Using provided access token');
    return shouldSave ? saveTokenToKeychain(tokenInput) : useTokenDirectly(tokenInput);
  } else {
    return shouldSave ? saveTokenError() : restoreTokenFromKeychain();
  }
};

const useTokenDirectly = token => Promise.resolve(token);

const saveTokenError = () =>
  Promise.reject('Error: You indicated that we should save a token, but no token was provided');

const saveTokenToKeychain = token => {
  console.log('Saving access token to keychain using settings', tokenKeychainSettings);
  return new Promise((resolve, reject) =>
    keychain.setPassword(
      {
        ...tokenKeychainSettings,
        password: token,
      },
      err => {
        if (err) return reject(err);
        console.log('Successfully saved access token to keychain!');
        resolve(token);
      }
    )
  );
};

const restoreTokenFromKeychain = () => {
  console.log('Restoring access token from keychain using settings', tokenKeychainSettings);
  return new Promise((resolve, reject) => {
    keychain.getPassword(tokenKeychainSettings, (err, token) => {
      if (err) return reject(err);
      console.log('Successfully restored access token from keychain!');
      resolve(token);
    });
  });
};

const getProjectId = async (projectInput, shouldSave) => {
  if (projectInput) {
    console.log('Using provided project');
    const projectId = parseProjectId(projectInput);
    return shouldSave ? saveProjectIdToKeychain(projectId) : projectId;
  } else {
    return restoreProjectIdFromKeychain();
  }
};

const parseProjectId = projectInput => {
  const matchProjectInput = /[0-9]{2,}/.exec(projectInput);
  if (!matchProjectInput) throw new Error(`Cannot determine project ID from input '${projectInput}'`);
  if (matchProjectInput.length > 1)
    console.log('Warning: Found more than one potential project ID; using the first match');
  return matchProjectInput[0];
};

const saveProjectIdToKeychain = projectId => {
  console.log('Saving project ID to keychain using settings', projectKeychainSettings);
  return new Promise((resolve, reject) =>
    keychain.setPassword(
      {
        ...projectKeychainSettings,
        password: projectId,
      },
      err => {
        if (err) return reject(err);
        console.log('Successfully saved project ID ${projectId} to keychain!');
        resolve(projectId);
      }
    )
  );
};

const restoreProjectIdFromKeychain = () => {
  console.log('Restoring project ID from keychain using settings', projectKeychainSettings);
  return new Promise((resolve, reject) => {
    keychain.getPassword(projectKeychainSettings, (err, projectId) => {
      if (err) return reject(err);
      console.log('Successfully restored project ID from keychain!');
      resolve(projectId);
    });
  });
};

module.exports = {
  getToken,
  getProjectId,
};
