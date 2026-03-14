#!/usr/bin/env bun
import { createCLI } from "./cli/index.js";

const program = createCLI();
program.parse(process.argv);
