import { extension_settings, getContext } from "../../../extensions.js";

const extensionName = "Jsontojsonl";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate data
            if (!data.chatMessages || !Array.isArray(data.chatMessages)) {
                toastr.error("Invalid file format: Missing or invalid chatMessages array.", "Error");
                return;
            }

            // Target the Current Character
            if (typeof this_chid === 'undefined' || this_chid === undefined) {
                toastr.warning("Please select a character first.");
                return;
            }

            // Extract Character Name
            const characterName = data.character?.name || "Character";

            // Extract User Name
            let userName = "User";
            if (data.personas && data.personas.length > 0 && data.personas[0].name) {
                userName = data.personas[0].name;
            } else if (data.persona_name) {
                userName = data.persona_name;
            }

            // Get and reverse messages
            const messages = data.chatMessages.reverse();

            let jsonlOutput = "";

            // Map messages
            for (const msg of messages) {
                const mappedMsg = {
                    name: msg.is_bot ? characterName : userName,
                    is_user: !msg.is_bot,
                    is_name: true,
                    send_date: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
                    mes: msg.message || ""
                };
                jsonlOutput += JSON.stringify(mappedMsg) + "\n";
            }

            // Prepare the Form Data
            const blob = new Blob([jsonlOutput], { type: "application/jsonlines" });
            const importFile = new File([blob], 'Janitor_Import.jsonl', { type: 'application/jsonlines' });
            const formData = new FormData();
            formData.append('avatar_url', characters[this_chid].avatar);
            formData.append('file', importFile);

            // Execute the API Call
            const response = await fetch('/api/chats/import', {
                method: 'POST',
                body: formData
            });

            // Handle the Response
            if (response.ok) {
                toastr.success('Chat imported successfully!');
                
                // Refresh the character's chat list
                if (typeof openCharacterChat === 'function') {
                    openCharacterChat(this_chid);
                } else if (typeof getChatList === 'function') {
                    getChatList();
                }
            } else {
                throw new Error("API returned an error");
            }

        } catch (error) {
            console.error("Janitor JSON to JSONL error:", error);
            toastr.error("Failed to import chat.", "Error");
        } finally {
            // Reset input so the same file can be uploaded again if needed
            event.target.value = "";
        }
    };

    reader.readAsText(file);
}

jQuery(async () => {
    try {
        // Load HTML
        const extensionHtml = await $.get(`${extensionFolderPath}/index.html`);
        $("#extensions_settings").append(extensionHtml);

        // Bind event
        $("#jsontojsonl_file_upload").on("change", handleFileUpload);
    } catch (error) {
        console.error("Failed to load Jsontojsonl extension:", error);
    }
});
