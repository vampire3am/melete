/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: { extend: {
    colors: {
      'royal-blue':'#1A3C8F','royal-blue-hover':'#0d2a60',primary:'#1A3C8F','primary-hover':'#0d2a60','on-primary':'#fff',
      'dark-gray':'#333','medium-gray':'#666','light-gray':'#888','border-gray':'#eee','bg-light':'#f9f9f9',outline:'#888','outline-variant':'#eee',secondary:'#666',
      surface:'#fff','surface-bright':'#fff','surface-dim':'#f3f3f4','surface-container-lowest':'#fff','surface-container-low':'#f9f9f9','surface-container':'#f9f9f9','surface-container-high':'#eee','surface-container-highest':'#e8e8e8','on-surface':'#000','on-surface-variant':'#333',error:'#ba1a1a'
    },
    borderRadius:{DEFAULT:'4px',sm:'2px',md:'4px',lg:'4px',xl:'4px',full:'4px'},
    spacing:{'gutter-mobile':'1rem','space-xl':'2.5rem','margin-mobile':'1.25rem',margin:'3rem','space-sm':'.5rem','space-lg':'1.5rem','space-xs':'.25rem',gutter:'1.5rem','space-md':'1rem'},
    fontFamily:{sans:['Inter','system-ui','sans-serif'],serif:['Playfair Display','Georgia','serif'],'body-lg':['Inter','sans-serif'],'headline-xl-mobile':['Playfair Display','serif'],'label-sm':['Inter','sans-serif'],'headline-lg':['Playfair Display','serif'],'headline-md':['Playfair Display','serif'],'label-md':['Inter','sans-serif'],'display-lg-mobile':['Playfair Display','serif'],'body-md':['Inter','sans-serif'],'title-md':['Playfair Display','serif'],'headline-xl':['Playfair Display','serif'],'display-lg':['Playfair Display','serif'],mono:['monospace']},
    fontSize:{'body-lg':['16px',{lineHeight:'28px'}],'headline-xl-mobile':['26px',{lineHeight:'1.3',fontWeight:'700'}],'label-sm':['12px',{lineHeight:'16px',letterSpacing:'.04em',fontWeight:'500'}],'headline-lg':['32px',{lineHeight:'1.3',fontWeight:'700'}],'headline-md':['24px',{lineHeight:'1.3',fontWeight:'600'}],'label-md':['12px',{lineHeight:'16px',letterSpacing:'.04em',fontWeight:'500'}],'display-lg-mobile':['26px',{lineHeight:'1.3',fontWeight:'700'}],'body-md':['16px',{lineHeight:'28px'}],'title-md':['18px',{lineHeight:'1.3',fontWeight:'600'}],'headline-xl':['32px',{lineHeight:'1.3',fontWeight:'700'}],'display-lg':['32px',{lineHeight:'1.3',fontWeight:'700'}]}
  }}
};
