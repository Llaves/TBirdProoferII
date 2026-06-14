# LLM Proofreader for Thunderbird
This Thunderbird extension uses an LLM (large language model, aka chatbot) to 
proofread your email on demand. The extension provides direct support for Gemini models plus support for any model available through OpenRouter. Both case require an API key. Gemini  
offers free use up to limits that are not likely to be relevant for proofing
email. OpenRouter offers a range of free and paid models.Proofreading a 4-5 paragraph email
costs a fraction of a cent on lower price models like gpt-4o-mini.

## Installation
Download the .xpi file at the root directory of the 
repository. From the Thunderbird menu bar click Tools->Add-ons and Extensions. In the 
new window that opens click the settings gear in the upper right and then click "Install add-on from file".Browse to wherever you downloaded the .xpi file and select it. Click yes in response to the pop-ups to allow installation. 


## Setup

Before you can proof any email you have to first enter your API key. In the main Thunderbird window click on the Proofreader icon, which is the letter P followed by LLMProofreader. In the dialog that pops-up, select either Google Gemini or OpenRouter and paste your API key into the box and click `Save Key`. You might want to click `View Key` just for confirmation. Enter the name of the model you wish to use and click enter.

Click the Proofreader icon again and now click `Manage Prompts`. Select the 
prompt you want to give to the LLM when proofing your email or create a new prompt of your choosing.

Your API key and your prompts will be saved in Thunderbird's storage. The keys can be read using the Inspector from the main Thunderbird window. There may be other ways to read the storage as well that are vulnerable to hacks. Use your judgement. For the openRouter API key make sure you have placed tight limits on expenditures. For routine email levels and proofreading, you can expect pennies per day. Make sure you know how to access your usage stats. If you're using the Gemini free tier your main hacking risk is that you'll get booted for excessive use.

## Proofing your email
From the composition window just click the extension icon (red P followed by LLMProofreader) . You will get a pop-up window while waiting for response. At the time of writing, OpenAI is taking 5 seconds or more to respond. Gemini seems to be faster - 2 seconds or so. 

If you have text selected in your message, that's all that will be proofed. Context around the message is not provided to the LLM. If there is no active selection, the entire message body will be sent. 

If you want to replace your original text with the suggested changes, copy the changes then select the original message and paste-without-formatting (ctrl-shift-V) and you should get what you want. 

 

## Signed Versions
I haven't submitted this to the extension store yet. Sorry.