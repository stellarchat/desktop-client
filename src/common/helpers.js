/* global ipcRenderer, module, moment, StellarSdk */

const invokeIPC = (channel, ...args) => {
  const _id = Math.floor(Math.random()*10000);
  const promise = new Promise((resolve, reject)=>{
    const cb = (event, id, err, result) => {
      if(id!==_id) return;
      ipcRenderer.removeListener(channel, cb);
      if(err) { reject(new Error(err)) } else { resolve(result) }
    }
    ipcRenderer.on(channel, cb)
  })
  ipcRenderer.send(channel, _id, ...args)
  return promise;
}

const toContactV1 = (contactV2) => {
  const contactV1 = {
    name    : contactV2.name,
    view    : contactV2.federation || contactV2.address,
    address : contactV2.address,
  }
  if(contactV2.defaultMemoType !== StellarSdk.Memo.MemoNone) {
    contactV1.memotype = contactV2.defaultMemoType;
    contactV1.memo = contactV2.defaultMemoValue;
  }
  return contactV1;
}

const toContactV2 = (contactV1) => ({
  address          : contactV1.address,
  federation       : (contactV1.view && contactV1.view[0] === 'G') ? undefined : contactV1.view,
  name             : contactV1.name,
  details          : '',
  created          : moment().format(),
  updated          : moment().format(),
  defaultMemoType  : contactV1.memotype || StellarSdk.Memo.MemoNone,
  defaultMemoValue : contactV1.memo,
})

module.exports = {
  invokeIPC,
  toContactV1,
  toContactV2,
}
