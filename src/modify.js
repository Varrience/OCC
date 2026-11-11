import Compiler from "./compile.js";
document.getElementById("fileUpload").addEventListener("submit", async function (e) {
    e.preventDefault();
    const convertBtn = document.getElementById("convertBtn");
    const statusDiv = document.getElementById("status");
    const projectId = document.getElementById("projectId").value;
    const projectZip = document.getElementById("zipFile");
    const projectJSON = document.getElementById("storageFile");
    statusDiv.textContent = "";
    statusDiv.className = "";
    convertBtn.disabled = true;

    try {
        if (!projectZip.files.length) {
            throw new Error("Please select a file first.");
        }

        const file = projectZip.files[0];
        if (file.type !== "application/zip" && !file.name.endsWith(".zip")) {
            throw new Error("Please select a valid ZIP file.");
        }

        statusDiv.textContent = "Processing file...";
        statusDiv.className = "info";

        new Compiler(projectZip, projectId, projectJSON)

    } catch (error) {
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.className = "error";
        console.error("Error:", error);
    } finally {
        convertBtn.disabled = false;
    }
});