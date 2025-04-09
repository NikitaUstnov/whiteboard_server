import { clusterize } from "./app.cluster";
import WhiteboardApp from "./app";

const app = new WhiteboardApp();

app.start();

// app.init().then(() => {
//   clusterize(async () => {
//     await app.start();
//   });
// });
