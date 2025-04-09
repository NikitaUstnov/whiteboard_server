import cluster from "cluster";
import { cpus } from "os";
const numCPUs = cpus().length;

export const clusterize = (callback: Function): void => {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on("exit", (worker) => {
      console.log(`Worker ${worker.process.pid} died`);
      cluster.fork();
    });
  } else {
    console.log(`Worker ${process.pid} started`);
    callback();
  }
};
