import { clusterize } from "./app.cluster";
import WhiteboardApp from "./app";

const app = new WhiteboardApp();

clusterize(app.start.bind(app));
