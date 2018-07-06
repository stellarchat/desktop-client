/* global ipcRenderer, module */

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

module.exports = {
    invokeIPC,
}
