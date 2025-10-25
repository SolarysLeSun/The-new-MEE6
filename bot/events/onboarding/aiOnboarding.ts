

import { Events, GuildMember, Message, DMChannel } from 'discord.js';
import { getServerConfig } from '@/lib/db';
import { roleAssignmentFlow } from '@/ai/flows/role-assignment-flow';
import type { AiRoleMapping } from '@/types';

// Collection to track users currently in the onboarding process
const onboadingUsers = new Map<string, { member: GuildMember; step: number; answers: string[] }>();

async function startOnboarding(member: GuildMember) {
    const config = await getServerConfig(member.guild.id, 'autoroles');
    if (!config?.ai_onboarding_enabled || config.ai_onboarding_questions.length === 0) {
        return;
    }

    try {
        const dmChannel = await member.createDM();
        await dmChannel.send(`👋 Bonjour et bienvenue sur **${member.guild.name}** ! Pour personnaliser votre expérience, je vais vous poser quelques questions.`);
        
        onboadingUsers.set(member.id, { member, step: 0, answers: [] });
        await askQuestion(dmChannel, member.id, config.ai_onboarding_questions);

    } catch (error) {
        console.error(`[AI Onboarding] Impossible d'envoyer un DM à ${member.user.tag}.`, error);
    }
}

async function askQuestion(channel: DMChannel, userId: string, questions: string[]) {
    const userData = onboadingUsers.get(userId);
    if (!userData || userData.step >= questions.length) {
        // End of questionnaire
        await endOnboarding(channel, userId);
        return;
    }
    
    const question = questions[userData.step];
    await channel.send(question);
}

export async function handleOnboardingResponse(message: Message) {
    if (message.author.bot || !onboadingUsers.has(message.author.id)) {
        return;
    }

    const userData = onboadingUsers.get(message.author.id)!;
    const config = await getServerConfig(userData.member.guild.id, 'autoroles');
    
    userData.answers.push(message.content);
    userData.step++;

    onboadingUsers.set(message.author.id, userData);

    await askQuestion(message.channel as DMChannel, message.author.id, config.ai_onboarding_questions);
}

async function endOnboarding(channel: DMChannel, userId: string) {
    const userData = onboadingUsers.get(userId)!;
    const { member, answers } = userData;
    const config = await getServerConfig(member.guild.id, 'autoroles');

    await channel.send("Merci pour vos réponses ! Je configure vos rôles sur le serveur...");
    onboadingUsers.delete(userId);

    try {
        const result = await roleAssignmentFlow({
            userAnswers: answers,
            roleMappings: config.ai_onboarding_roles,
        });

        if (result.rolesToAssign.length > 0) {
            const roles = await Promise.all(result.rolesToAssign.map(id => member.guild.roles.fetch(id).catch(() => null)));
            const validRoles = roles.filter(r => r !== null);
            
            if (validRoles.length > 0) {
                await member.roles.add(validRoles as any[]);
                const roleNames = validRoles.map(r => `**@${r?.name}**`).join(', ');
                await channel.send(`✅ Les rôles suivants vous ont été attribués : ${roleNames}`);
            } else {
                 await channel.send("Je n'ai pas pu vous attribuer de rôles correspondants à vos réponses.");
            }
        } else {
            await channel.send("Vos réponses ne correspondaient à aucun de nos rôles prédéfinis pour le moment, mais merci d'avoir participé !");
        }
    } catch (error) {
        console.error("[AI Onboarding] Erreur lors de l'assignation des rôles :", error);
        await channel.send("Désolé, une erreur est survenue lors de l'attribution de vos rôles. Veuillez contacter un administrateur.");
    }
}


export const name = Events.GuildMemberAdd;
export async function execute(member: GuildMember) {
    await startOnboarding(member);
}
