import { register as registerCluster } from "@dawngrid/cluster-plugin";
import { register as registerHello } from "@dawngrid/hello-plugin";
import { register as registerImages } from "@dawngrid/images-plugin";
import { register as registerRobot } from "@dawngrid/robot-plugin";
import { register as registerTrain } from "@dawngrid/train-plugin";
import type { PluginRegister } from "@dawngrid/plugin-sdk";

/** Compile-time table. Enabled ids come from the host API; missing ids are never registered. */
export const pluginRegisters: Record<string, PluginRegister> = {
  hello: registerHello,
  cluster: registerCluster,
  images: registerImages,
  train: registerTrain,
  robot: registerRobot,
};
