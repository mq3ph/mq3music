const subjects={
  auto:'Infer the subject configuration only from explicit clues in the title and lyrics such as he/she pronouns, man/woman wording, a duet label, two voices, or an explicitly described couple. NEVER infer gender, ethnicity, nationality, age, or cultural background from a personal name alone. If the subject is unclear, use one culturally neutral adult silhouette with gender not emphasized.',
  female:'Feature one real adult woman as the clear primary subject.',
  male:'Feature one real adult man as the clear primary subject.',
  'woman-man':'Feature BOTH one real adult woman and one real adult man as equally important subjects. This is suitable for a love song or woman-and-man duet. Keep both clearly visible and visually distinct.',
  'two-women':'Feature TWO real adult women as equally important duet subjects, clearly distinct from one another.',
  'two-men':'Feature TWO real adult men as equally important duet subjects, clearly distinct from one another.',
  neutral:'Feature one culturally neutral real adult human silhouette. Do not emphasize gender.'
};

const moods={auto:'Infer the emotional mood from the complete lyrics.',romantic:'romantic, intimate and warm',hopeful:'hopeful and forward-looking',emotional:'deeply emotional and reflective',melancholic:'melancholic, restrained and cinematic',uplifting:'uplifting, resilient and inspiring',warm:'warm, comforting and sincere',dramatic:'dramatic, cinematic and emotionally strong'};
const scenes={auto:'Choose the most fitting realistic environment from the lyrics.',sunset:'Use a realistic sunset or golden-hour environment.',sunrise:'Use a realistic sunrise environment.',waterfront:'Use a realistic sea, lake, riverside or waterfront environment.',city:'Use tasteful evening city lights or an urban overlook.',rain:'Use a realistic rainy or just-after-rain environment.',nature:'Use a realistic natural landscape such as a field, garden, hills or trees.',window:'Use realistic window light in a quiet interior or sheltered terrace.',road:'Use a realistic road, path, bridge or open journey setting.'};

function clean(value,max=12000){return String(value||'').trim().slice(0,max);}

export function buildArtworkPrompt(input={}){
  const title=clean(input.title,180),lyrics=clean(input.lyrics,12000),category=clean(input.category,40)||'Name Songs';
  const subject=subjects[input.subject]||subjects.auto,mood=moods[input.mood]||moods.auto,scene=scenes[input.scene]||scenes.auto;
  const categoryRule={
    'Name Songs':'Treat this as a personal name-song cover. Use the lyrics, not the name itself, to decide emotion or subject cues.',
    Inspirational:'Emphasize hope, resilience, faith, purpose, renewal or strength when those themes are present. Avoid romantic posing unless the lyrics clearly call for it.',
    OPM:'Use a grounded contemporary cinematic atmosphere. Keep the setting culturally neutral unless the lyrics explicitly establish a location or cultural detail.',
    'Love Songs':'Express the relationship described by the lyrics. When the selected subject is Woman + Man, BOTH the woman and man must appear. For togetherness use natural closeness; for longing or separation show believable emotional distance.'
  }[category]||'';
  return `Create a premium square 1:1 PHOTOREALISTIC cinematic music-cover photograph for MQ3 Music.

SONG TITLE: ${title||'(untitled)'}
CATEGORY: ${category}

SUBJECT DIRECTION:
${subject}

CATEGORY DIRECTION:
${categoryRule}

MOOD:
${mood}

SCENE:
${scene}

LYRICS TO INTERPRET:
${lyrics||'(No lyrics supplied. Use only the title, category and selected subject settings; do not invent biography.)'}

MANDATORY VISUAL STYLE:
- The subject or subjects must look like REAL photographed adults, never drawings or graphic cutouts.
- Create a true photorealistic silhouette using strong cinematic backlighting, natural rim light and believable photographic exposure.
- Preserve realistic human anatomy, natural shoulders, neck, hands, body proportions, clothing folds and believable posture.
- Hair must look natural and physically believable. Use a fresh hairstyle and pose variation rather than repeating the same generic silhouette.
- Facial identity and detailed facial features should remain mostly obscured by backlight, shadow, angle or distance, while the people still clearly look real.
- Premium cinematic photography, realistic depth, atmospheric light, tasteful color grading, emotionally readable composition.
- Keep the square composition clean and suitable for a compact music player cover.
- Do not infer ethnicity or nationality from a name. Avoid stereotypes.
- No rendered title, no lettering, no logo, no watermark.

STRICTLY AVOID:
cartoon, anime, vector art, flat illustration, icon silhouette, clip art, paper-cut style, posterized human shapes, painted portrait, 3D character render, plastic-looking people, malformed anatomy, extra limbs, duplicate people unless the selected subject requires multiple people.`;
}

export function registerArtworkRoute(app,{env,put,randomUUID,fail}){
  app.post('/api/admin/artwork-generate',async(req,res)=>{
    if(!env.OPENAI_API_KEY)fail(503,'Artwork generation is not configured yet. Add OPENAI_API_KEY in Vercel Environment Variables.');
    if(!env.BLOB_READ_WRITE_TOKEN)fail(503,'Cover image storage is not configured.');
    const title=clean(req.body?.title,180),lyrics=clean(req.body?.lyrics,12000);
    if(!title)fail(400,'Enter the song title first.');
    if(!lyrics)fail(400,'Paste the lyrics first so the artwork can be based on the song.');
    const prompt=buildArtworkPrompt(req.body||{});
    const response=await fetch('https://api.openai.com/v1/images/generations',{
      method:'POST',
      headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:'gpt-image-2',prompt,size:'1024x1024',quality:'medium'})
    });
    let data={};try{data=await response.json();}catch{}
    if(!response.ok){const detail=String(data?.error?.message||'Image generation request failed.').slice(0,300);fail(response.status===429?429:502,detail);}
    const b64=data?.data?.[0]?.b64_json;if(!b64)fail(502,'Image generation returned no artwork.');
    let image;try{image=Buffer.from(b64,'base64');}catch{fail(502,'Generated artwork could not be decoded.');}
    if(!image.length)fail(502,'Generated artwork was empty.');
    const name=`${randomUUID()}.png`;
    await put(`covers/${name}`,image,{access:'private',contentType:'image/png',addRandomSuffix:false,token:env.BLOB_READ_WRITE_TOKEN});
    res.json({url:`/api/covers/${name}`,prompt});
  });
}
