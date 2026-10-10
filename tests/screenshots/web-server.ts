import { runApplicationServer } from "../support/application-server";
import { DEMO_FIXED_NOW, seedDemoDatabase } from "./demo-data";

void runApplicationServer({ now: DEMO_FIXED_NOW, seed: seedDemoDatabase });
