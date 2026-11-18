#!/usr/bin/env node

const { program } = require("commander");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const FormData = require("form-data");
const { createApiClient, readToken, writeToken, requestFailure } = require("./security");

let client;
function getClient() {
  client ??= createApiClient(
    axios, process.env.BASE_URL || "https://localhost:9115/api", process.env.TOLL_API_CA_FILE
  );
  return client;
}

// Commander diagnostics can echo unknown arguments supplied by the caller.
program.configureOutput({
  outputError: (message, write) => {
    const context = message.startsWith("error: unknown command") ? "unknown command" : "invalid command or options";
    write(`error: ${context}. See --help.\n`);
  },
});

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────

function getTokenPath() {
  return path.resolve(__dirname, ".token");
}

function getToken() {
  const tokenPath = getTokenPath();
  try {
    return readToken(tokenPath);
  } catch (error) {
    console.error(error.code === "ENOENT"
      ? "No authentication token found. Please log in first."
      : "The local token file could not be read securely.");
    process.exit(1);
  }
}

/**
 * A generic API request handler.
 * It prints the response directly—if the response is CSV (a string), it prints it as-is.
 * Otherwise, it stringifies the JSON response.
 */
async function apiRequest(endpoint, method = "GET", data = {}) {
  const token = getToken();
  try {
    const response = await getClient().request({
      method,
      url: endpoint,
      data,
      headers: {
        "X-OBSERVATORY-AUTH": token,
        "Content-Type": "application/json",
      },
    });

    if (typeof response.data === "string") {
      console.log(response.data);
    } else {
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error("❌ API Error:", requestFailure(error));
    process.exit(1);
  }
}

// ─── COMMAND DEFINITIONS ──────────────────────────────────────────

program
  .command("healthcheck")
  .description("Check system health")
  .action(() => apiRequest("/admin/healthcheck"));

program
  .command("resetpasses")
  .description("Reset passes in the system")
  .action(() => apiRequest("/admin/resetpasses", "POST"));

program
  .command("resetstations")
  .description("Reset stations from CSV file")
  .action(() => apiRequest("/admin/resetstations", "POST"));

program
  .command("login")
  .requiredOption("--username <username>", "Username")
  .requiredOption("--passw <password>", "Password")
  .action(async (options) => {
    const { username, passw } = options;
    const data = new URLSearchParams({ username, password: passw }).toString();
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };

    try {
      const response = await getClient().post("/login", data, { headers });
      if (response.data.token) {
        const tokenPath = getTokenPath();
        writeToken(tokenPath, response.data.token);
        console.log("Login successful! Token saved.");
      } else {
        console.error("Login failed: No token received.");
        process.exit(1);
      }
    } catch (error) {
      console.error("Login failed:", requestFailure(error));
      process.exit(1);
    }
  });

program
  .command("logout")
  .description("Logout user")
  .action(async () => {
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
      await getClient().post("/logout", {}, { headers });
      fs.unlinkSync(getTokenPath());
      console.log("Logout successful!");
    } catch (error) {
      console.error("Logout failed:", requestFailure(error));
      process.exit(1);
    }
  });

program
  .command("admin")
  .description("Admin commands")
  .option("--usermod", "Modify or create user")
  .option("--username <username>", "Username for usermod")
  .option("--passw <password>", "Password for usermod")
  .option("--users", "List all users")
  .option("--addpasses", "Upload CSV passes file")
  .option("--source <file>", "CSV file path for addpasses")
  .action(async (options) => {
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };

    if (options.usermod) {
      if (!options.username || !options.passw) {
        console.error("Missing --username or --passw for --usermod.");
        process.exit(1);
      }
      console.log(`🔹 Modifying user: ${options.username}`);
      try {
        await getClient().post(
          "/admin/usermod",
          { username: options.username, passw: options.passw },
          { headers }
        );
        console.log(`User ${options.username} modified successfully.`);
      } catch (error) {
        console.error("Failed to modify user:", requestFailure(error));
        process.exit(1);
      }
    } else if (options.users) {
      console.log("🔹 Fetching users...");
      try {
        const response = await getClient().get("/admin/users", { headers });
        console.log("Registered Users:");
        response.data.users.forEach((user) => console.log(`- ${user}`));
      } catch (error) {
        console.error("Failed to fetch users:", requestFailure(error));
        process.exit(1);
      }
    } else if (options.addpasses) {
      if (!options.source) {
        console.error("Missing --source for --addpasses.");
        process.exit(1);
      }
      const filePath = path.resolve(__dirname, "../backend/", options.source);
      console.log(`Uploading file: ${filePath}`);
      if (!fs.existsSync(filePath)) {
        console.error(`File does not exist: ${filePath}`);
        process.exit(1);
      }
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      try {
        await getClient().post("/admin/addpasses", formData, {
          headers: {
            "X-OBSERVATORY-AUTH": token,
            ...formData.getHeaders(),
          },
        });
        console.log("Passes added successfully.");
      } catch (error) {
        console.error("Failed to add passes:", requestFailure(error));
        process.exit(1);
      }
    } else {
      console.error("Invalid admin command. Use --usermod, --users, or --addpasses.");
      process.exit(1);
    }
  });

program
  .command("tollstationpasses")
  .requiredOption("--station <stationID>", "Toll station ID")
  .requiredOption("--from <YYYYMMDD>", "Start date (YYYYMMDD)")
  .requiredOption("--to <YYYYMMDD>", "End date (YYYYMMDD)")
  .option("--format <format>", "Response format (json/csv)")
  .action(async (options) => {
    const { station, from, to, format } = options;
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
      const response = await getClient().get(
        `/tollStationPasses/${station}/${from}/${to}?format=${format}`,
        { headers }
      );
      if (format === "csv") {
        console.log("Fetching data in CSV form...");
        console.log(response.data);
      } else {
        console.log("Fetching data in JSON form...");
        console.log(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error(
        "Error fetching toll station passes:",
        requestFailure(error)
      );
      process.exit(1);
    }
  });

program
  .command("passanalysis")
  .requiredOption("--stationop <stationOpID>", "Station operator ID")
  .requiredOption("--tagop <tagOpID>", "Tag operator ID")
  .requiredOption("--from <YYYYMMDD>", "Start date (YYYYMMDD)")
  .requiredOption("--to <YYYYMMDD>", "End date (YYYYMMDD)")
  .option("--format <format>", "Response format (json/csv)", "json")
  .action(async (options) => {
    const { stationop, tagop, from, to, format } = options;
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
      const response = await getClient().get(
        `/passAnalysis/${stationop}/${tagop}/${from}/${to}?format=${format}`,
        { headers }
      );
      if (format === "csv") {
        console.log("Fetching data in CSV form...");
        console.log(response.data);
      } else {
        console.log("Fetching data in JSON form...");
        console.log(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error(
        "Error fetching pass analysis:",
        requestFailure(error)
      );
      process.exit(1);
    }
  });

program
  .command("passescost")
  .requiredOption("--stationop <tollOpID>", "Toll operator ID")
  .requiredOption("--tagop <tagOpID>", "Tag operator ID")
  .requiredOption("--from <YYYYMMDD>", "Start date (YYYYMMDD)")
  .requiredOption("--to <YYYYMMDD>", "End date (YYYYMMDD)")
  .option("--format <format>", "Response format (json/csv)", "json")
  .action(async (options) => {
    const { stationop, tagop, from, to, format } = options;
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
      const response = await getClient().get(
        `/passesCost/${stationop}/${tagop}/${from}/${to}?format=${format}`,
        { headers }
      );
      if (format === "csv") {
        console.log("Fetching data in CSV form...");
        console.log(response.data);
      } else {
        console.log("Fetching data in JSON form...");
        console.log(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error(
        "Error fetching passes cost:",
        requestFailure(error)
      );
      process.exit(1);
    }
  });

program
  .command("chargesby")
  .requiredOption("--opid <tollOpID>", "Toll operator ID")
  .requiredOption("--from <YYYYMMDD>", "Start date (YYYYMMDD)")
  .requiredOption("--to <YYYYMMDD>", "End date (YYYYMMDD)")
  .option("--format <format>", "Response format (json/csv)", "json")
  .action(async (options) => {
    const { opid, from, to, format } = options;
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
      const response = await getClient().get(
        `/chargesBy/${opid}/${from}/${to}?format=${format}`,
        { headers }
      );
      if (format === "csv") {
        console.log("Fetching data in CSV form...");
        console.log(response.data);
      } else {
        console.log("Fetching data in JSON form...");
        console.log(JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error(
        "Error fetching charges by operator:",
        requestFailure(error)
      );
      process.exit(1);
    }
  });

program
  .command("generateinvoices")
  .description("Generate invoices between operators")
  .action(async () => {
    const token = getToken();
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
      const response = await getClient().get("/invoice/generate", { headers });
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("Error generating invoices:", requestFailure(error));
      process.exit(1);
    }
  });

program
  .command("payinvoice")
  .requiredOption("--issuing_op_id <issuer>", "Issuing operator ID")
  .requiredOption("--receiving_op_id <receiver>", "Receiving operator ID")
  .description("Mark an invoice as paid (only the issuer can do this)")
  .action(async (options) => {
    const { issuing_op_id, receiving_op_id } = options;
    const token = getToken();
    const headers = {
      "X-OBSERVATORY-AUTH": token,
      "Content-Type": "application/json",
    };
    try {
      const response = await getClient().post(
        "/invoice/pay",
        { issuing_op_id, receiving_op_id },
        { headers }
      );
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error(
        "Error marking invoice as paid:",
        requestFailure(error)
      );
      process.exit(1);
    }
  });

// Optional stub for undefined command "errorparam"
program
  .command("errorparam")
  .description("Test error handling for unknown options")
  .action(() => {
    console.error("Unknown command: errorparam");
    process.exit(1);
  });

program.parseAsync(process.argv).catch(() => {
  console.error("The command could not be completed.");
  process.exitCode = 1;
});
