import { expect } from 'chai';
import { exec, execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Resolve the test file’s directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The CLI folder (where se2459.js and .token reside)
const cliDir = path.join(__dirname, '../cli');
// Full path to the CLI application
const cliPath = path.join(cliDir, 'se2459.js');
// Full path to the token file (as written by the login command)
const tokenPath = path.join(cliDir, '.token');

// Helper: Login and generate a valid token
const loginAndGenerateToken = (done) => {
  if (!process.env.TOLL_TEST_ADMIN_PASSWORD) return done(new Error('Set TOLL_TEST_ADMIN_PASSWORD for an isolated disposable database'));
  execFile(
    process.execPath, [cliPath, 'login', '--username', 'admin', '--passw', process.env.TOLL_TEST_ADMIN_PASSWORD],
    { cwd: cliDir },
    (error, stdout, stderr) => {
      if (error) return done(error);
      expect(stdout).to.include('Login successful');
      done();
    }
  );
};

// Helper: Remove the token file if it exists
const deleteTokenFile = () => {
  if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
};

// Helper: Extract JSON from output (ignores leading log lines)
const extractJSON = (output) => {
  const jsonStart = output.indexOf('{');
  if (jsonStart === -1) throw new Error("JSON response not found in output");
  return JSON.parse(output.substring(jsonStart));
};

// Test Suite
(process.env.RUN_INTEGRATION === '1' ? describe : describe.skip)('CLI Application Tests', () => {
  // Before each test, login so that a token is present
  beforeEach((done) => {
    loginAndGenerateToken(done);
  });

  // After all tests, clean up the token file
  after(() => {
    deleteTokenFile();
  });

  it('should display help information', (done) => {
    exec(`node ${cliPath} --help`, { cwd: cliDir }, (error, stdout, stderr) => {
      if (error) return done(error);
      expect(stdout).to.include('Usage:');
      done();
    });
  });

  it('should perform healthcheck successfully', (done) => {
    exec(`node ${cliPath} healthcheck`, { cwd: cliDir }, (error, stdout, stderr) => {
      if (error) return done(error);
      let data;
      try {
        data = extractJSON(stdout);
      } catch (err) {
        return done(err);
      }
      // Adjusted expectation: check for status and other properties as returned
      expect(data).to.have.property("status", "OK");
      expect(data).to.have.property("dbconnection", "mysql://root@localhost/toll_system");
      expect(data).to.have.property("n_stations", 14);
      expect(data).to.have.property("n_passes", 56);
      done();
    });
  });

  it('should reset passes successfully', (done) => {
    exec(`node ${cliPath} resetpasses`, { cwd: cliDir }, (error, stdout, stderr) => {
      if (error) return done(error);
      let data;
      try {
        data = extractJSON(stdout);
      } catch (err) {
        return done(err);
      }
      expect(data).to.have.property("status", "OK");
      done();
    });
  });

  it('should reset stations successfully', function (done) {
    this.timeout(5000); // Increase timeout to 5 seconds
    exec(`node ${cliPath} resetstations`, { cwd: cliDir }, (error, stdout, stderr) => {
      if (error) return done(error);
      let data;
      try {
        data = extractJSON(stdout);
      } catch (err) {
        return done(err);
      }
      // Adjust expectation: expecting a { status: 'OK' } response instead of an empty object
      expect(data).to.have.property("status", "OK");
      done();
    });
  });

  it('should list all users successfully', (done) => {
    exec(`node ${cliPath} admin --users`, { cwd: cliDir }, (error, stdout, stderr) => {
      if (error) return done(error);
      expect(stdout).to.include("Registered Users:");
      expect(stdout).to.include("- admin");
      expect(stdout).to.include("- AM_operator");
      expect(stdout).to.include("- EG_operator");
      expect(stdout).to.include("- KO_operator");
      expect(stdout).to.include("- MO_operator");
      expect(stdout).to.include("- NAO_operator");
      expect(stdout).to.include("- NO_operator");
      expect(stdout).to.include("- OO_operator");
      done();
    });
  });

  it('should add passes successfully from a CSV file', function (done) {
    this.timeout(10000); // Extend timeout to 10 seconds for file upload
    exec(
      `node ${cliPath} admin --addpasses --source csv/passes-sample.csv`,
      { cwd: cliDir },
      (error, stdout, stderr) => {
        if (error) return done(error);
        expect(stdout).to.include("Passes added successfully.");
        done();
      }
    );
  });

  it('should logout successfully', (done) => {
    exec(`node ${cliPath} logout`, { cwd: cliDir }, (error, stdout, stderr) => {
      if (error) return done(error);
      expect(stdout).to.include("Logout successful");
      done();
    });
  });

  it('should fail when invalid command is used', (done) => {
    exec(`node ${cliPath} invalidCommand`, { cwd: cliDir }, (error, stdout, stderr) => {
      expect(stderr).to.include("error: unknown command");
      done();
    });
  });

  it('should fail if token is missing', (done) => {
    deleteTokenFile(); // Ensure no token exists
    exec(`node ${cliPath} healthcheck`, { cwd: cliDir }, (error, stdout, stderr) => {
      expect(stderr).to.include("No authentication token found");
      done();
    });
  });
});
