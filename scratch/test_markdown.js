const content = `- 1 suíte e 2 demi-suítes<color:rgb(0, 0, 0)>
</color>- lavabo<color:rgb(0, 0, 0)>
</color>- 2 vagas de garagem livres`;

const pattern = /(\*\*.*?\*\*|\*.*?\*|__.*?__|~~.*?~~|`.*?`|<color:\s*[^>]+?>.*?<\/color>)/g;
const matches = content.split(pattern);

console.log('Matches:', matches);

const cleanContent = content.replace(/<color:[^>]+?>|<\/color>/g, '');
console.log('Clean Content:', cleanContent);
