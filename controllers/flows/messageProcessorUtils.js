function extractMessageText(mensajeObj) {
    if (!mensajeObj?.message) return '';

    if (mensajeObj.message.conversation) {
        return mensajeObj.message.conversation.toLowerCase().trim();
    }
    
    if (mensajeObj.message.extendedTextMessage?.text) {
        return mensajeObj.message.extendedTextMessage.text.toLowerCase().trim();
    }
    
    return '';
}

module.exports = {
    extractMessageText
};
