import readlineSync from "readline-sync";
import { GoogleGenAI } from "@google/genai";
import {exec} from "child_process";
import { promisify } from "util";
import os from 'os';


const ai = new GoogleGenAI({apiKey: "AIzaSyDO8Wf3yXUIkyFqWBUF-a6Hc_Gy6dAov6U"});


const History = [];

// Tool create karte hai, jo kisi bhi terminal/ shell command ko  execute kar sakta hai 

const asyncExecute = promisify(exec);
const platform = os.platform();

async function executeCommand({command}) {
    try{
        const {stdout, stderr} = await asyncExecute(command);

        if (stderr) {
            return `Error: ${stderr}`;
        }
        return `Success: ${stdout} || Task executed successfully`;
    }catch (e) {
        return `Error: ${e}`;
    }
}


const executeCommandDeclaration = {
    name: 'executeCommand',
    description: 'Execute a command in the terminal or shell. A command can be to create a folder, file, write on a file, edit the file or delete the file.',
    parameters: {
        type: 'OBJECT',
        properties: {
            command: {
                type: 'STRING',
                description: 'IT will be the single terminal/ shell command ex: mkdir test',
            },
        },
        required: ['command'],
    },
}


const availableTools = {
    executeCommand
}

async function runAgent(userProblem){

    History.push({
        role: 'user',
        parts: [{text: userProblem}]
    });


    while(true) {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: History,
            config: {
                systemInstruction: `You are a Website Builder expert. You have to create the frontend of the website by analysing the user input.
                You have the access of tools which can run and execute any shell/ terminal command.
                
                Current user operation system is ${platform}.
                Give command to the user according to its operating system support.
                
                <----What is your job---->
                1: Analyse the user query to see what type of website he want to build.
                2: Give them command one by one, step by step.
                3: Use available tool executeCommand
                
                // Now you can give them command in following format:
                1: First create a folder, Ex: mkdir "calculator" 
                2: Inside the folder, create index.html, Ex: touch "calculator/index.html"
                3: Then create style.css same as above
                4: Then create script.js
                5: Then write a code in html file

                You have to provide the tarminal or shell command to user, they will directly execute it.
                `,
                tools: [{
                    functionDeclarations: [executeCommandDeclaration],
                }],
            },
        });

        const parts = response.candidates[0].content.parts;
        const functionCall = parts.find(p => p.functionCall)?.functionCall;

        if(functionCall){
            const {name , args} = functionCall;

            console.log('Calling function for help =>', name);

            const funCall = availableTools[name];
            const result = await funCall(args);

            const functionResponsePart = {
                name: name,
                response: {
                    result
                }
            }

            //model
            History.push({
                role: 'model',
                parts: [
                    {
                        functionCall
                    }
                ]
            });

            History.push({
                role: 'function',
                parts: [
                    {
                        functionResponse: functionResponsePart,
                    }
                ]
            });

        }
        else {
            const text = parts.find(p => p.text)?.text || "No response";
            History.push({ role: 'model', parts: [{ text }] });
            console.log(text);
            break;
        }
    }
}


async function main() {
    while (true) {
        console.log("========I am a cursor: Let's build a website========");
        const userProblem = readlineSync.question("Ask me anything---> ");
        await runAgent(userProblem);
    }
}

main();