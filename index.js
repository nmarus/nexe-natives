const path = require('path');
const fs = require('fs');

const requireNative = require('./lib/require-native');

const defaultLocalPath = path.join(process.env.HOME, '.nexe_natives');

function getPathToNodeModules(mainPath) {
  const parent = path.dirname(mainPath);

  // if reached root of fs
  if (parent === mainPath) {
    throw Error('could not find node_modules directory');
  }

  if (parent.endsWith('node_modules')) {
    return parent;
  }

  return getPathToNodeModules(parent);
}

function getPathToPackageJson(mainPath) {
  const parent = path.dirname(mainPath);

  // if reached root of fs
  if (parent === mainPath) {
    throw Error('could not find package.json');
  }

  const packageJsonPath = path.join(parent, 'package.json');

  try {
    fs.accessSync(packageJsonPath, fs.constants.F_OK);
    return packageJsonPath;
  } catch (err) {
    return getPathToPackageJson(parent);
  }
}

module.exports = (mainPath, opts = {}) => {
  const externalModulesDir = opts.localPath || defaultLocalPath;
  const internalModulesDir = getPathToNodeModules(mainPath);
  const removeOnExit = (typeof opts.removeOnExit !== 'boolean' || opts.removeOnExit);

  // parse package.json for module name
  // eslint-disable-next-line
  const moduleName = require(getPathToPackageJson(mainPath)).name;

  if (removeOnExit) {
    process.on('exit', () => {
      const moduleDir = path.join(externalModulesDir, moduleName);
      fs.rmdirSync(moduleDir, { recursive: true });
      const list = fs.readdirSync(externalModulesDir);
      if (list.length === 0) {
        fs.rmdirSync(externalModulesDir, { recursive: true });
      }
    });
  }

  return requireNative(moduleName, internalModulesDir, externalModulesDir);
};
