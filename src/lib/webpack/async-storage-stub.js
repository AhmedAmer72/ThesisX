/** Browser stub — MetaMask SDK optionally imports React Native async-storage. */
const storage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

module.exports = storage;
module.exports.default = storage;
