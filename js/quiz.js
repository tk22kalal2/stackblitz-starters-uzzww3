import { fetchFromAPI } from './api.js';

export class Quiz {
    constructor() {
        this.currentQuestion = null;
        this.score = 0;
        this.timer = null;
        this.timeLimit = 0;
        this.questionLimit = 0;
        this.questionsAnswered = 0;
        this.wrongAnswers = 0;
    }

    async generateQuestion(subject) {
        if (this.questionLimit && this.questionsAnswered >= this.questionLimit) {
            return null;
        }

        // Randomly decide between text and image question
        const isImageQuestion = Math.random() < 0.3; // 30% chance for image questions

        const prompt = isImageQuestion ? 
            `Generate a medical image-based multiple choice question about ${subject}. The question should include a detailed description of what would be shown in a medical image (like an X-ray, MRI, CT scan, histology slide, anatomical diagram, etc). Format the response exactly as follows:
            {
                "question": "Looking at this [type of image], what is the diagnosis/finding?",
                "imageDescription": "Detailed description of what the image shows",
                "imageType": "Type of medical image (x-ray/MRI/CT/etc)",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correctIndex": correct_option_index_here,
                "isImageQuestion": true
            }` :
            `Generate a multiple choice question about ${subject} with 4 options and mark the correct answer. Format the response exactly as follows:
            {
                "question": "The question text here",
                "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                "correctIndex": correct_option_index_here,
                "isImageQuestion": false
            }`;

        try {
            const response = await fetchFromAPI(prompt);
            return JSON.parse(response);
        } catch (error) {
            return {
                question: 'Failed to load question. Please try again.',
                options: ['Error', 'Error', 'Error', 'Error'],
                correctIndex: 0,
                isImageQuestion: false
            };
        }
    }

    async getExplanation(question, options, correctIndex, isImageQuestion = false, imageDescription = '') {
        const prompt = `
        For this medical question and its options:
        ${isImageQuestion ? `Image Description: ${imageDescription}\n` : ''}
        Question: "${question}"
        Options: ${options.map((opt, i) => `${i + 1}. ${opt}`).join(', ')}
        Correct Answer: ${options[correctIndex]}

        Please provide a point-wise explanation in this exact format:
        CORRECT ANSWER (${options[correctIndex]}):
        • Point 1 about why it's correct
        • Point 2 about why it's correct

        WHY OTHER OPTIONS ARE INCORRECT:
        ${options.map((opt, i) => i !== correctIndex ? `${opt}:
        • Point 1 why it's wrong
        • Point 2 why it's wrong` : '').filter(Boolean).join('\n\n')}
        `;

        try {
            return await fetchFromAPI(prompt);
        } catch (error) {
            return 'Failed to load explanation.';
        }
    }

    async askDoubt(doubt, question, isImageQuestion = false, imageDescription = '') {
        const prompt = `
        Regarding this medical question:
        ${isImageQuestion ? `Image Description: ${imageDescription}\n` : ''}
        "${question}"
        
        User's doubt: "${doubt}"
        
        Please provide a clear, detailed explanation addressing this specific doubt in the context of the question.
        Focus on medical accuracy and explain in a way that's helpful for medical students.
        `;

        try {
            return await fetchFromAPI(prompt);
        } catch (error) {
            return 'Failed to get answer. Please try again.';
        }
    }

    getResults() {
        return {
            total: this.questionsAnswered,
            correct: this.score,
            wrong: this.wrongAnswers,
            percentage: this.questionsAnswered > 0 
                ? Math.round((this.score / this.questionsAnswered) * 100) 
                : 0
        };
    }
}