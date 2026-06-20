// Use built-in fetch (available in Node 18+)

const OLLAMA_URL = 'http://localhost:11434/api/generate';

async function generateRecommendations(data) {
    const diet = data.diet || 'Veg';
    const exercise = data.exercise || 'None';
    const lang = String(data.lang || 'en').toLowerCase();

    console.log('=== LANGUAGE DEBUG ===');
    console.log('Raw data.lang:', data.lang);
    console.log('Processed lang:', lang);
    console.log('lang.startsWith("k"):', lang.startsWith('k'));
    console.log('lang.includes("kn"):', lang.includes('kn'));

    // Check for 'kn', 'kan', 'kannada' etc.
    const isKannada = lang.startsWith('k') || lang.includes('kn');
    console.log('FINAL isKannada:', isKannada);
    console.log('======================');
    console.log('Final Language Decision:', isKannada ? 'KANNADA' : 'ENGLISH');

    const languagePrompt = isKannada
        ? "CRITICAL: The ENTIRE response MUST be in KANNADA language (ಕನ್ನಡ). Output only the JSON object."
        : "Please respond in English language only.";

    const prompt = `
Requirements:
1. Provide a COMPREHENSIVE and DETAILED dietary suggestion in ${isKannada ? 'Kannada' : 'English'} based on their diet type(${diet}) and sugar levels.
    2. Provide a COMPREHENSIVE and DETAILED exercise suggestion in ${isKannada ? 'Kannada' : 'English'} based on their selection(${exercise}).
    3. Never use medical panic language.Be reassuring and professional.
    4. Focus on practical, actionable advice for an elderly user.
    5. ${languagePrompt}
    
    Format your response STRICTLY as a JSON object with two fields: "diet" and "exercise".
    `;

    try {
        const response = await fetch(OLLAMA_URL, {
            method: 'POST',
            body: JSON.stringify({
                model: 'deepseek-r1:1.5b', // Or whatever version is available
                prompt: prompt,
                format: 'json',
                stream: false
            })
        });

        const result = await response.json();
        const parsed = JSON.parse(result.response);
        console.log('AI Response parsed successfully');
        return parsed;
    } catch (error) {
        console.error('Ollama Error:', error);
        // Fallback recommendations
        if (isKannada) {
            return {
                diet: "ನಿಮ್ಮ ಆಹಾರದಲ್ಲಿ ಸಕ್ಕರೆ ಮತ್ತು ಹೆಚ್ಚು ಕಾರ್ಬೋಹೈಡ್ರೇಟ್ ಅಂಶಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಿ. ಹೆಚ್ಚಾಗಿ ಹಸಿರು ಸೊಪ್ಪು, ತರಕಾರಿಗಳು ಮತ್ತು ನಾರಿನಂಶವಿರುವ ಆಹಾರವನ್ನು ಸೇವಿಸಿ. ಇದು ನಿಮ್ಮ ಸಕ್ಕರೆ ಮಟ್ಟವನ್ನು ನಿಯಂತ್ರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಬೇಳೆಕಾಳುಗಳು ಮತ್ತು ಸಜ್ಜೆ, ರಾಗಿಯಂತಹ ಧಾನ್ಯಗಳನ್ನು ಬಳಸಿ.",
                exercise: exercise === 'None' ? "ದಿನಕ್ಕೆ ಕನಿಷ್ಠ 15 ನಿಮಿಷಗಳ ಕಾಲ ಮನೆಯಲ್ಲೇ ಅಥವಾ ಉದ್ಯಾನವನದಲ್ಲಿ ನಿಧಾನವಾಗಿ ನಡೆಯುವುದನ್ನು ಪ್ರಾರಂಭಿಸಿ. ಇದು ಮಧುಮೇಹ ನಿಯಂತ್ರಣಕ್ಕೆ ತುಂಬಾ ಉತ್ತಮ ಮತ್ತು ಸುರಕ್ಷಿತ ಚಟುವಟಿಕೆಯಾಗಿದೆ." : "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ವ್ಯಾಯಾಮದ ದಿನಚರಿಯನ್ನು ಮುಂದುವರಿಸಿ. ನಡಿಗೆ ಅಥವಾ ಯೋಗವನ್ನು ಮರೆಯಬೇಡಿ. ಆಯಾಸವಾದರೆ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ."
            };
        }
        return {
            diet: "Focus on consuming high-fiber vegetables, whole grains, and lean proteins. Avoid processed sugars and white bread. Staying hydrated with water instead of juices is also highly recommended.",
            exercise: exercise === 'None' ? "We recommend starting with a gentle 15-minute walk indoors or in your garden. Regular movement helps lower blood sugar levels naturally." : "Keep up with your current routine! Consistent activity is key. Make sure to stay hydrated and take breaks if you feel any discomfort."
        };
    }
}

module.exports = { generateRecommendations };
