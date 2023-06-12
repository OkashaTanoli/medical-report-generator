'use client'

import Image from 'next/image'
import { Inter } from 'next/font/google'
import { useState } from 'react';
import { Loader } from '@/components';
import { HiUser } from 'react-icons/hi'
import moment from 'moment';
import axios from 'axios';


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


    const [audioFile, setAudioFile] = useState(null);
    const [uploading, setUploading] = useState(false)
    const [loading, setLoading] = useState('')
    const [transcribing, setTranscribing] = useState(false)
    const [result, setResult] = useState<any[]>([])
    const [active, setActive] = useState<any>(false)
    const [error, setError] = useState('')
    const [copy, setCopy] = useState({
        hpi: false,
        report: false,
        transcription: false
    })

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (file.type !== 'audio/mpeg') {
            alert("Please select only audio file")
            return
        }
        setAudioFile(file);
    };


    function filteredText(text: string) {
        const symbolsToRemove = /[{},.:]/g;
        const trimmedText = text.trim();
        const filteredText = trimmedText.replace(symbolsToRemove, '');
        return filteredText;
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
        let hpi = document.getElementById("hpi") as HTMLInputElement;
        let report = document.getElementById("report") as HTMLInputElement;
        let transcription = document.getElementById("transcription") as HTMLInputElement;
        let copiedText = fieldName === 'hpi' ? hpi : fieldName === 'report' ? report : transcription
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
        }, 2000);

    }



    async function callOpenAiApi(transcription: string, task: string, name?: string) {
        let prompt = `${transcription} ${task === 'hpi' ? "create a small hpi of this conversation. don't add patient's and doctor's personal info. Hpi should be in form of a paragraph." :
            task === 'name' ? "scrape only the name of the patient from the conversation in just one word" :
                task === 'disease' ? "scrape the name of the disease from the conversation" :
                    `Generate a small medical report on patient instructions, the name of patient is ${name}. The report should be like a proper report with greeting like "Dear {Person's name}" at the top, also add line break after it and then instructions and then end with regards.`
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
            // console.log(data.choices[0].text)
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
                    const hpi = await callOpenAiApi(transcriptionResult.text, 'hpi')
                    const name = filteredText(await callOpenAiApi(transcriptionResult.text, 'name'))
                    const disease = filteredText(await callOpenAiApi(transcriptionResult.text, 'disease'))
                    const report = await callOpenAiApi(transcriptionResult.text, 'report', name)
                    setLoading('')
                    setResult([...result, { id: transcriptionResult.id, transcribedText: transcriptionResult.text, hpi: hpi.trim(), name, disease, report: report.trimStart(), created_at: new Date() }])
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
            // console.log("trans =====>>>>>>>>>>", err)
        }
    }

    const handleSubmit = async () => {
        setLoading('uploading')
        setError('')
        const formData = new FormData();
        formData.append('file', audioFile!);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json()
            if (data.success) {
                await handleTranscript(data.upload_url)
            }
        }
        catch {
            setError('Error occurred in uploading audio')
            setLoading('')
            // console.log("error")
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
                        <h1 className='text-white font-bold'>Freed</h1>
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
                                {
                                    audioFile &&
                                    <button onClick={handleSubmit} disabled={Boolean(loading)} className={`h-[50px] w-[250px] flex justify-center items-center ${loading ? 'bg-zinc-500' : 'bg-zinc-900'} rounded-md mt-10 text-white font-bold tracking-widest`}>
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
                                <h1 className='text-2xl text-zinc-800 font-semibold pt-7'>{active.name} : {active.disease}</h1>
                                <div className='px-5 bg-white mt-10 pb-5'>
                                    <h1 className='text-xl text-zinc-800 font-semibold py-5'>HPI</h1>
                                    <textarea name="" id="hpi" rows={7} defaultValue={active.hpi.trim()} className='w-full border p-3 resize-none border-zinc-400 rounded-md' />
                                    <div className='flex justify-end mt-3'>
                                        <button onClick={() => copyText('hpi')} className='text-lg text-zinc-700 font-bold bg-zinc-300 rounded-full px-10 py-3'>{copy.hpi ? 'Copied!' : 'Copy'}</button>
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
                    }
                </div>
            </div>
        </div>
    )
}
