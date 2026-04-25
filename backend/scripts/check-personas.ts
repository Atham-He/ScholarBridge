import { db } from '../lib/db';

async function main() {
  const personas = await db.persona.findMany({
    include: {
      skill: {
        include: {
          owner: {
            include: {
              mentorProfile: true
            }
          }
        }
      }
    }
  });

  console.log('Found', personas.length, 'personas');
  personas.forEach(p => {
    console.log('\n- Slug:', p.slug, '| Build Status:', p.buildStatus);
    console.log('  Skill:', p.skill.title);
    console.log('  Mentor:', p.skill.owner.mentorProfile?.displayName);
    console.log('  LLM Provider:', p.llmProvider);
  });
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
