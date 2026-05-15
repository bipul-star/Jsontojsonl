import { extension_settings, getContext } from "../../../extensions.js";



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

            // Get ST context
            const context = getContext();
            const chid = context.characterId;
            const characters = context.characters;

            // Target the Current Character
            if (chid === undefined || chid === null || !characters[chid]) {
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
            formData.append('avatar_url', characters[chid].avatar);
            formData.append('file', importFile);

            // Execute the API Call using jQuery $.ajax
            // This is required because SillyTavern's jQuery setup automatically 
            // attaches the CSRF token to $.ajax requests.
            const response = await new Promise((resolve, reject) => {
                $.ajax({
                    url: '/api/chats/import',
                    type: 'POST',
                    data: formData,
                    processData: false,   // Tell jQuery not to process the data
                    contentType: false,   // Tell jQuery not to set contentType
                    success: (data) => resolve({ ok: true, data }),
                    error: (jqXHR, textStatus, errorThrown) => {
                        console.error('Import API error:', jqXHR.status, errorThrown);
                        resolve({ ok: false, status: jqXHR.status, error: errorThrown });
                    }
                });
            });

            // Handle the Response
            if (response.ok) {
                toastr.success('Chat imported successfully!');
                
                // Refresh the character's chat list
                if (typeof openCharacterChat === 'function') {
                    openCharacterChat(chid);
                } else if (typeof getChatList === 'function') {
                    getChatList();
                }
            } else {
                throw new Error(`API returned an error (${response.status})`);
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
        const extensionHtml = `
<div class="extension_settings_block" id="jsontojsonl_settings_block">
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>Janitor to SillyTavern Chat Converter</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content" style="display: none;">
            <p>Easily convert Janitor AI chat export files (.json) into SillyTavern's chat format (.jsonl). Upload your downloaded Janitor AI chat JSON file here to get the SillyTavern compatible version.</p>
            
            <div class="flex-container alignitemscenter flex-gap-10 margin-top-10">
                <label for="jsontojsonl_file_upload" class="menu_button">
                    <i class="fa-solid fa-file-arrow-up"></i> Upload Janitor JSON
                </label>
                <input id="jsontojsonl_file_upload" type="file" accept=".json" style="display: none;">
            </div>
        </div>
    </div>
</div>
        `;
        $("#extensions_settings").append(extensionHtml);

        // Bind event
        $("#jsontojsonl_file_upload").on("change", handleFileUpload);
    } catch (error) {
        console.error("Failed to load Jsontojsonl extension:", error);
    }
});
