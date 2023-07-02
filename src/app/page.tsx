'use client'

import Image from 'next/image'
import { Inter } from 'next/font/google'
import { useState } from 'react';
import { Loader } from '@/components';
import { HiUser } from 'react-icons/hi'
import moment from 'moment';
import axios from 'axios';
import { AudioRecorder } from 'react-audio-voice-recorder';



// Hi, Ella. This is Doctor McLergan How are you feeling?
// My throat hurts, I have a fever and I think my lymph nodes might be swollen.
// It sounds like you might have strep throat. I am going to prescribe antibiotics. Drink lots of fluids and rest. Lets followup in 2 weeks.
// Okay, doctor.
// Thank you.




const inter = Inter({ subsets: ['latin'] })

export default function Home() {

    const base_url = 'https://api.assemblyai.com/v2'
    const headers = {
        authorization: process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY
    }





    // interface IActive {
    //     id: string,
    //     transcribedText: string,
    //     subjective: string,
    //     objective: string,
    //     plan: string,
    //     name: string,
    //     disease: string,
    //     report: string,
    //     created_at: Date,
    //     hpi: string,
    //     psychiatricHistory: string,
    //     pastSurgicalHistory: string,
    //     medicationsCurrentlyTaking: string,
    //     patientsObservation: string,
    //     tests: string,
    //     summary: string
    // }

    const [audioFile, setAudioFile] = useState<any>(null);
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState('')
    const [transcribing, setTranscribing] = useState(false)
    const [result, setResult] = useState<any[]>([])
    const [active, setActive] = useState<any>(false)
    const [error, setError] = useState('')
    const [copy, setCopy] = useState({
        subjective: false,
        objective: false,
        plan: false,
        report: false,
        transcription: false,
        hpi: false,
        psychiatricHistory: false,
        pastMedicalHistory: false,
        pastSurgicalHistory: false,
        psychiatricFamilyHistory: false,
        medicationsCurrentlyTaking: false,
        patientsObservation: false,
        tests: false,
        summary: false
    })


    const addAudioElement = (blob: any) => {
        const url = URL.createObjectURL(blob);
        const file = new File([blob], 'audio', { type: 'audio/mpeg' })
        setAudioFile(() => file)
        handleSubmit(file)
    };

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (file.type !== 'audio/mpeg') {
            alert("Please select only audio file")
            return
        }
        // console.log(file)
        setAudioFile(file);
    };


    function removeDotComma(text: string) {
        let modifiedText = text.trim(); // Remove leading and trailing whitespace
        // Remove dots and commas from the beginning of the text
        while (modifiedText.charAt(0) === '.' || modifiedText.charAt(0) === ',') {
            modifiedText = modifiedText.slice(1);
        }
        return modifiedText;
    }

    function filteredText(text: string) {
        const symbolsToRemove = /[{},.:]/g;
        const filteredText = text.replace(symbolsToRemove, '');
        const trimmedText = filteredText.trim();
        return trimmedText;
    }
    function removeExtraTextFromReport(text: string) {
        const dearIndex = text.toLowerCase().indexOf("dear");
        if (dearIndex !== -1) {
            const filteredText = text.substring(dearIndex);
            return filteredText;
        }
        return text; // Return the original text if "dear" is not found
    }

    function copyText(fieldName: string) {
        let subjective = document.getElementById("subjective") as HTMLInputElement;
        let objective = document.getElementById("objective") as HTMLInputElement;
        let plan = document.getElementById("plan") as HTMLInputElement;
        let report = document.getElementById("report") as HTMLInputElement;
        let transcription = document.getElementById("transcription") as HTMLInputElement;
        let hpi = document.getElementById("hpi") as HTMLInputElement;
        let psychiatricHistory = document.getElementById("psychiatricHistory") as HTMLInputElement;
        let pastMedicalHistory = document.getElementById("pastMedicalHistory") as HTMLInputElement;
        let pastSurgicalHistory = document.getElementById("pastSurgicalHistory") as HTMLInputElement;
        let psychiatricFamilyHistory = document.getElementById("psychiatricFamilyHistory") as HTMLInputElement;
        let medicationsCurrentlyTaking = document.getElementById("medicationsCurrentlyTaking") as HTMLInputElement;
        let patientsObservation = document.getElementById("patientsObservation") as HTMLInputElement;
        let tests = document.getElementById("tests") as HTMLInputElement;
        let summary = document.getElementById("summary") as HTMLInputElement;
        let copiedText = fieldName === 'subjective' ? subjective : fieldName === 'objective' ? objective : fieldName === 'plan' ? plan : fieldName === 'report' ? report : fieldName === 'transcription' ? transcription : fieldName === 'hpi' ? hpi : fieldName === 'psychiatricHistory' ? psychiatricHistory : fieldName === 'pastMedicalHistory' ? pastMedicalHistory : fieldName === 'pastSurgicalHistory' ? pastSurgicalHistory : fieldName === 'psychiatricFamilyHistory' ? psychiatricFamilyHistory : fieldName === 'medicationsCurrentlyTaking' ? medicationsCurrentlyTaking : fieldName === 'patientsObservation' ? patientsObservation : fieldName === 'tests' ? tests : fieldName === 'summary' ? summary : summary
        navigator.clipboard.writeText(copiedText.value);
        setCopy({
            ...copy,
            [fieldName]: true
        })

        setTimeout(() => {
            setCopy({
                ...copy,
                [fieldName]: false
            })
        }, 1000);

    }



    async function callOpenAiApi(transcription: string, task: string, name?: string) {
        let prompt = `${transcription} ${task === 'subjective' ? "write a very small subjective of this conversation contains 25 to 40 words. Don't add patient's and doctor's personal info. Subjective should be in form of a paragraph. Subjective should only contain what the patient stated (Patient Response). Don't include what doctor recommended and suggested to patient in conversation" :
            task === 'name' ? "scrape only the name of the patient from the conversation in just one word if there is no name found just say Not Found" :
                task === 'disease' ? "scrape the name of the disease from the conversation if there is no disease discussed just say Disease not discussed" :
                    task === 'report' ? `Generate a small medical report on patient instructions, the name of patient is ${name}. The report should be like a proper report with greeting like "Dear {Person's name}" at the top, also add line break after it and then instructions and then end with regards.` :
                        task === 'objective' ? `write a very detailed objective of this conversation. 200 t0 300 words. Objective should only contain the facts the provider is mentioned (not question asked by the provider)and nothing should include the patient's response on this section. By definition, Objective is not influenced by personal feelings or opinions in considering and representing facts.` :
                            task === 'plan' ? `Write detailed assessments and plans discussed in above conversation. It must contain medicines with their dose discussed in conversation if it is not discussed then simply say no medicines were discussed. try to answer in detail` :
                                task === 'hpi' ? `Write down HPI of the patient from the conversation. It should consist of 40 to 50 words. Don't add any thing related to family of patient and anything that is not discussed in conversation.` :
                                    task === 'psychiatricHistory' ? `Write down Psychiatric History of the patient from the conversation. Just include patients history don't include patient's family in it.` :
                                        task === 'pastMedicalHistory' ? `Write down past medical history (any disease in past) of the patient in points. Don't add any disease that patient's family has suffered.` :
                                            task === 'pastSurgicalHistory' ? `Write down past surgical history of the patient. If it is not included in conversation then just say Patient does not have any surgical history.` :
                                                task === 'psychiatricFamilyHistory' ? `Write down all diseases that patient's family had suffered in history and also tell who has suffered which disease. If it is not included in conversation then just say Patient does not have any psychiatric family history` :
                                                    task === 'medicationsCurrentlyTaking' ? `Write down all medicines that patient is currently taking with their dose. Just add the medicines that is included in conversation and answer should be in points. If it is not just say not taking any medicines currently.` :
                                                        task === 'patientsObservation' ? `Write down the observation of patient from the conversation.` :
                                                            task === 'tests' ? `Write down all medical tests (labs, screening tools, blood pressure) of patient included in the conversation. If tests are not discussed then just say No tests have done but don't add any thing that is not discussed in conversation ` :
                                                                task === 'summary' ? `Write down the summary of the conversation between doctor and patient.` :
                                                                    'hi'
            }`

        // console.log("prompt ==>> ", prompt);
        // console.log("name ==>> ", name);

        try {
            const response = await fetch(`https://api.openai.com/v1/completions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPEN_AI_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: 'text-davinci-003',
                    prompt: prompt,
                    max_tokens: 3000,
                    n: 1
                })
            })
            const data = await response.json()
            console.log(task, " ===== ", data.choices[0].text)
            return data.choices[0].text
        }
        catch (err) {
            setError('Error occurred in generating report')
            setLoading('')
        }
        // console.log('task prompt ====>>> ', prompt)
        return task

    }

    const handleTranscript = async (upload_url: string) => {
        try {

            setLoading('transcribing')

            const url = base_url + '/transcript'
            const response = await axios.post(url, { audio_url: upload_url }, { headers })
            const transcriptId = response.data.id
            const pollingEndpoint = `https://api.assemblyai.com/v2/transcript/${transcriptId}`

            while (true) {
                const pollingResponse = await axios.get(pollingEndpoint, {
                    headers: headers
                })
                const transcriptionResult = pollingResponse.data

                if (transcriptionResult.status === 'completed') {
                    setLoading('generating report')
                    const subjective = removeDotComma(await callOpenAiApi(transcriptionResult.text, 'subjective'))
                    const objective = await callOpenAiApi(transcriptionResult.text, 'objective')
                    const name = filteredText(await callOpenAiApi(transcriptionResult.text, 'name'))
                    const disease = filteredText(await callOpenAiApi(transcriptionResult.text, 'disease'))
                    const report = await callOpenAiApi(transcriptionResult.text, 'report', name)
                    const plan = await callOpenAiApi(transcriptionResult.text, 'plan')
                    const hpi = await callOpenAiApi(transcriptionResult.text, 'hpi')
                    const psychiatricHistory = filteredText(await callOpenAiApi(transcriptionResult.text, 'psychiatricHistory'))
                    const pastMedicalHistory = filteredText(await callOpenAiApi(transcriptionResult.text, 'pastMedicalHistory'))
                    const pastSurgicalHistory = await callOpenAiApi(transcriptionResult.text, 'pastSurgicalHistory')
                    const psychiatricFamilyHistory = filteredText(await callOpenAiApi(transcriptionResult.text, 'psychiatricFamilyHistory'))
                    const medicationsCurrentlyTaking = await callOpenAiApi(transcriptionResult.text, 'medicationsCurrentlyTaking')
                    const patientsObservation = await callOpenAiApi(transcriptionResult.text, 'patientsObservation')
                    const tests = filteredText(await callOpenAiApi(transcriptionResult.text, 'tests'))
                    const summary = await callOpenAiApi(transcriptionResult.text, 'summary')
                    setLoading('')
                    setResult(
                        [
                            ...result,
                            {
                                id: transcriptionResult.id,
                                transcribedText: transcriptionResult.text,
                                subjective: subjective.trim(),
                                objective: objective.trim(),
                                plan: plan.trim(),
                                name,
                                disease,
                                report: report.trimStart(),
                                created_at: new Date(),
                                hpi,
                                psychiatricHistory,
                                pastMedicalHistory,
                                pastSurgicalHistory,
                                psychiatricFamilyHistory,
                                medicationsCurrentlyTaking,
                                patientsObservation,
                                tests,
                                summary
                            }
                        ]
                    )


                    break
                } else if (transcriptionResult.status === 'error') {
                    console.log(`Transcription failed: ${transcriptionResult.error}`)
                } else {
                    await new Promise((resolve) => setTimeout(resolve, 2000))
                }
            }
        }
        catch (err) {
            setError('Error occurred in transcribing audio')
            setLoading('')
            console.log("trans =====>>>>>>>>>>", err)
        }
    }

    const handleSubmit = async (file?: File) => {
        setLoading('uploading')
        setError('')
        const formData = new FormData();
        formData.append('file', file ? file : audioFile);

        try {
            // const response = await fetch('/api/upload', {
            //     method: 'POST',
            //     body: formData,
            // });
            // const data = await response.json()
            // if (data.success) {
            const response = await axios.post(`${base_url}/upload`, file ? file : audioFile, { headers })
            const upload_url = response.data.upload_url
            console.log(upload_url)
            await handleTranscript(upload_url)
            // }

        }
        catch (err: any) {
            setError('Error occurred in uploading audio')
            setLoading('')
            console.log(err)
        }


    }

    return (
        <div className='flex justify-center items-center min-h-screen bg-gray-100'>
            <div className='w-[80%] h-[90vh] bg-white flex box_shadow'>
                <div className='w-[30%] flex flex-col border-r'>
                    <div className='h-[60px] border-b'></div>
                    <div className='flex justify-center my-3'>
                        <button onClick={() => { setActive(false); setAudioFile(null) }} className='w-[90%] text-sm text-white font-bold bg-blue-900 py-3 text-center rounded-md'>START A VISIT</button>
                    </div>
                    <div className='flex-grow flex flex-col gap-2 overflow-y-auto'>
                        {
                            result.map((val, index) => {
                                return (
                                    <div onClick={() => setActive(val)} key={index} className='p-5 bg-blue-50 cursor-pointer flex gap-3'>
                                        <div className='w-[60px]'>
                                            <HiUser size={30} className='text-zinc-400' />
                                        </div>
                                        <div className='flex flex-col gap-1 text-zinc-800'>
                                            <p className='font-bold'>{val.name}</p>
                                            <p>{moment(val.created_at).format('l')} , {moment(val.created_at).format('LT')}</p>
                                            <p className='text-zinc-500 font-semibold'>{val.disease}</p>
                                        </div>
                                    </div>
                                )
                            })
                        }
                    </div>
                </div>
                <div className='w-[70%] bg-zinc-100 flex flex-col'>
                    <div className='h-[60px] flex-shrink-0 bg-blue-900 flex items-center px-5'>
                        <h1 className='text-white font-bold'>Practical notes</h1>
                    </div>
                    {
                        !active ?
                            <div className='flex-grow flex flex-col gap-5 justify-center items-center bg-white w-full mx-auto'>
                                <h1 className='text-lg text-zinc-900 font-bold text-center'>Upload audio containing conversation between doctor and patient</h1>
                                <div className='flex gap-5'>
                                    {audioFile && <audio controls src={URL.createObjectURL(audioFile)} />}
                                    <label htmlFor="audio">
                                        <input type="file" id='audio' hidden accept="audio/*" onChange={handleFileChange} />
                                        <div className='w-[150px] h-[50px] flex justify-center items-center cursor-pointer font-bold rounded-full border border-dashed border-zinc-500 mx-auto text-center'>Upload Audio</div>
                                    </label>
                                </div>
                                <AudioRecorder
                                    onRecordingComplete={addAudioElement}
                                    audioTrackConstraints={{
                                        noiseSuppression: true,
                                        echoCancellation: true,
                                    }}
                                    showVisualizer={true}
                                />
                                {
                                    audioFile &&
                                    <button onClick={() => handleSubmit()} disabled={Boolean(loading)} className={`h-[50px] w-[250px] flex justify-center items-center ${loading ? 'bg-zinc-500' : 'bg-zinc-900'} rounded-md mt-10 text-white font-bold tracking-widest`}>
                                        {
                                            loading ? `${loading} ...` : 'Start Process'
                                        }
                                    </button>
                                }
                                {
                                    error &&
                                    <p className='text-red-600 font-semibold text-center'>{error}</p>
                                }

                            </div>
                            :
                            <div className='flex-grow px-5 overflow-y-auto'>
                                <h1 className='text-xl text-zinc-800 font-semibold pt-7'>{active.name} : {active.disease}</h1>
                                <div className=''>
                                    <h1 className='text-2xl font-bold text-zinc-800 mt-5'>SOAP Note</h1>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Subjective</h1>
                                        <textarea name="" id="subjective" rows={7} defaultValue={active.subjective.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('subjective')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.subjective ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Objective</h1>
                                        <textarea name="" id="objective" rows={7} defaultValue={active.objective.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('objective')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.objective ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Assessments & Plan</h1>
                                        <textarea name="" id="plan" rows={7} defaultValue={active.plan.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('plan')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.plan ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Patient Instructions</h1>
                                        <textarea name="" id="report" rows={7} defaultValue={removeExtraTextFromReport(active.report)} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('report')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.report ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Transcription Summary</h1>
                                        <textarea name="" id="transcription" rows={7} defaultValue={active.transcribedText} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('transcription')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.transcription ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                </div>
                                <div className='pt-10 border-t'>
                                    <h1 className='text-2xl font-bold text-zinc-800 mt-5'>PSYCH Note</h1>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>HPI</h1>
                                        <textarea name="" id="hpi" rows={7} defaultValue={active.hpi.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('hpi')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.hpi ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>PsychHx (Psychiatric History)</h1>
                                        <textarea name="" id="psychiatricHistory" rows={7} defaultValue={active.psychiatricHistory.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('psychiatricHistory')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.psychiatricHistory ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>PMHx (Past medical history)</h1>
                                        <textarea name="" id="pastMedicalHistory" rows={7} defaultValue={active.pastMedicalHistory.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('pastMedicalHistory')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.pastMedicalHistory ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>PSHx (Past surgical history)</h1>
                                        <textarea name="" id="pastSurgicalHistory" rows={7} defaultValue={active.pastSurgicalHistory.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('pastSurgicalHistory')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.pastSurgicalHistory ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>PsychFHx (Psychiatric family history)</h1>
                                        <textarea name="" id="psychiatricFamilyHistory" rows={7} defaultValue={active.psychiatricFamilyHistory.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('psychiatricFamilyHistory')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.psychiatricFamilyHistory ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Medications Currently Taking</h1>
                                        <textarea name="" id="medicationsCurrentlyTaking" rows={7} defaultValue={active.medicationsCurrentlyTaking.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('medicationsCurrentlyTaking')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.medicationsCurrentlyTaking ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>MSE (Observation of the patient)</h1>
                                        <textarea name="" id="patientsObservation" rows={7} defaultValue={active.patientsObservation.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('patientsObservation')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.patientsObservation ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Tests (Labs, screening tools, blood pressure)</h1>
                                        <textarea name="" id="tests" rows={7} defaultValue={active.tests.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('tests')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.tests ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                    <div className='px-5 bg-white mt-10 pb-5'>
                                        <h1 className='text-xl text-zinc-800 font-semibold py-5'>Psychiatric Impression ( Brief summary of the conversation)</h1>
                                        <textarea name="" id="summary" rows={7} defaultValue={active.summary.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                        <div className='flex justify-end mt-3'>
                                            <button onClick={() => copyText('summary')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.summary ? 'Copied!' : 'Copy'}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                    }
                </div>
            </div>
        </div>
    )
}
