
import { GoogleGenAI, Type, Modality } from "@google/genai";

// The API key is expected to be available in the execution environment.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might want to handle this more gracefully.
  // For this environment, we assume the key is injected.
  console.warn(
    "Google AI API key not found. Please ensure it's set in your environment variables as API_KEY."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateContentFromUrl = async (url: string): Promise<{ imagePrompt: string; bannerTitle: string; bannerSubheadline: string; }> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the content of the article at the following URL: ${url}. Based on its content, generate three things in the same language as the article: 1. A visually descriptive prompt for an AI image generator. The prompt should capture the article's main subject, atmosphere, and key visual elements. 2. A short, engaging, and attention-grabbing title for a banner image. 3. A very short, descriptive subheadline (max 10 words) that complements the main title. Return the result as a JSON object with keys "imagePrompt", "bannerTitle", and "bannerSubheadline".`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            imagePrompt: {
              type: Type.STRING,
              description: "A visually descriptive prompt for an AI image generator, capturing the article's essence.",
            },
            bannerTitle: {
              type: Type.STRING,
              description: "A short, engaging, and attention-grabbing title for a banner image.",
            },
            bannerSubheadline: {
              type: Type.STRING,
              description: "A very short, descriptive subheadline that complements the main title.",
            },
          },
          required: ['imagePrompt', 'bannerTitle', 'bannerSubheadline'],
        }
      }
    });

    const responseText = response.text.trim();
    if (!responseText) {
      throw new Error("Failed to generate content. The response was empty.");
    }

    const parsedResponse = JSON.parse(responseText);

    return {
        imagePrompt: parsedResponse.imagePrompt,
        bannerTitle: parsedResponse.bannerTitle,
        bannerSubheadline: parsedResponse.bannerSubheadline
    };

  } catch (error) {
    console.error("Error generating content from URL:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    throw new Error("Could not analyze the URL. It might be inaccessible or contain content that couldn't be processed.");
  }
};

export const generateImage = async (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:5' | '4:3' | '3:4' = '1:1'): Promise<string> => {
  try {
    // Add instruction to prevent the model from rendering text on the image itself.
    const finalPrompt = `${prompt}. IMPORTANT: Do not include any text, words, or letters in the image. The image must be purely visual.`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated. The model may have refused the prompt.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
     if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    throw new Error("Could not generate an image from the prompt. The request may have been blocked or the model is currently unavailable.");
  }
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
    try {
        const match = base64Image.match(/^data:(image\/(?:png|jpeg));base64,(.*)$/);
        if (!match) {
            throw new Error("Invalid image data URL format.");
        }
        const mimeType = match[1];
        const imageData = match[2];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: imageData, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                // The model usually returns PNG for edits.
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }

        throw new Error("No edited image was returned from the model.");

    } catch (error) {
        console.error("Error editing image:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            throw new Error("The provided API key is invalid. Please check your configuration.");
        }
        throw new Error("Could not edit the image. The request may have been blocked or failed.");
    }
};

export const generateCopyFromUrl = async (url: string): Promise<{ primaryText: string; headline: string; description: string; keywords: string[]; }> => {
  try {
    const model = 'gemini-2.5-flash';
    const prompt = `Analyze the article at ${url}. Based on its content, generate marketing copy in Spanish, suitable for a social media post promoting it. Provide the following four components: 1. "primaryText": A caption of no more than 125 characters. 2. "headline": A short, catchy headline of no more than 40 characters. 3. "description": A link description of no more than 30 characters. 4. "keywords": An array of the 5 most relevant keywords from the article. Return the result as a JSON object.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryText: {
              type: Type.STRING,
              description: "A caption for a social media post, max 125 characters.",
            },
            headline: {
              type: Type.STRING,
              description: "A short, catchy headline, max 40 characters.",
            },
            description: {
                type: Type.STRING,
                description: "A link description, max 30 characters."
            },
            keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of the 5 most relevant keywords from the article."
            }
          },
          required: ['primaryText', 'headline', 'description', 'keywords'],
        }
      }
    });

    const responseText = response.text.trim();
    if (!responseText) {
      throw new Error("Failed to generate copy. The response was empty.");
    }

    const parsedResponse = JSON.parse(responseText);
    return parsedResponse;

  } catch (error) {
    console.error("Error generating copy from URL:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    throw new Error("Could not generate copy for the URL.");
  }
};

export const generateCopyFromText = async (prompt: string, title: string): Promise<{ primaryText: string; headline: string; description: string; keywords: string[]; }> => {
  try {
    const model = 'gemini-2.5-flash';
    const apiPrompt = `Based on the following banner title "${title}" and image prompt "${prompt}", generate marketing copy in Spanish suitable for a social media post. Provide the following four components: 1. "primaryText": A caption of no more than 125 characters. 2. "headline": A short, catchy headline of no more than 40 characters. 3. "description": A link description of no more than 30 characters. 4. "keywords": An array of the 5 most relevant keywords. Return the result as a JSON object.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: apiPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryText: {
              type: Type.STRING,
              description: "A caption for a social media post, max 125 characters.",
            },
            headline: {
              type: Type.STRING,
              description: "A short, catchy headline, max 40 characters.",
            },
            description: {
                type: Type.STRING,
                description: "A link description, max 30 characters."
            },
            keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "An array of the 5 most relevant keywords based on the prompt and title."
            }
          },
          required: ['primaryText', 'headline', 'description', 'keywords'],
        }
      }
    });

    const responseText = response.text.trim();
    if (!responseText) {
      throw new Error("Failed to generate copy. The response was empty.");
    }

    const parsedResponse = JSON.parse(responseText);
    return parsedResponse;

  } catch (error) {
    console.error("Error generating copy from text:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    throw new Error("Could not generate copy from the provided text.");
  }
};

export const translateCopy = async (
  copy: { primaryText: string; headline: string; description: string; keywords: string[]; },
  targetLanguage: string
): Promise<{ primaryText: string; headline: string; description: string; keywords: string[]; }> => {
  try {
    const model = 'gemini-2.5-flash';
    const languageName = {
      'en': 'English',
      'pt-BR': 'Brazilian Portuguese',
      'es': 'Spanish',
    }[targetLanguage];

    const prompt = `Translate the following JSON object containing marketing copy to ${languageName}. Keep the JSON structure and keys the same. Ensure the translated text respects the original's tone and character limits (caption <= 125 chars, headline <= 40 chars, description <= 30 chars). Also, translate the keywords.

Original Copy (JSON):
${JSON.stringify(copy, null, 2)}

Return only the translated JSON object.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryText: { type: Type.STRING },
            headline: { type: Type.STRING },
            description: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['primaryText', 'headline', 'description', 'keywords'],
        }
      }
    });

    const responseText = response.text.trim();
    if (!responseText) {
      throw new Error("Failed to translate copy. The response was empty.");
    }

    const parsedResponse = JSON.parse(responseText);
    return parsedResponse;

  } catch (error) {
    console.error(`Error translating copy to ${targetLanguage}:`, error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    throw new Error(`Could not translate copy to ${targetLanguage}.`);
  }
};