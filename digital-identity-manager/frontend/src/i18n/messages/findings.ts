import type { MessageMap } from '../types'

/** Findings, relationships, correlation review queue and shared chart chrome. */
export const findings = {
  'findings.title': { en: 'Findings', fr: 'Résultats' },
  'findings.description': {
    en: 'Filter, edit, and inspect findings associated with the active identity.',
    fr: 'Filtrez, modifiez et inspectez les résultats associés à l’identité active.',
  },
  'findings.descriptionReview': {
    en: 'Review discovered findings, their confidence, status, and supporting evidence.',
    fr: 'Examinez les résultats découverts, leur confiance, leur statut et les preuves associées.',
  },
  'findings.add': { en: 'Add finding', fr: 'Ajouter un résultat' },
  'findings.loading': { en: 'Loading findings…', fr: 'Chargement des résultats…' },
  'findings.percent': { en: '{value}%', fr: '{value} %' },

  'findings.column.title': { en: 'Title', fr: 'Titre' },
  'findings.column.discovered': { en: 'Discovered', fr: 'Découvert le' },

  'findings.empty.title': { en: 'No findings yet', fr: 'Aucun résultat pour le moment' },
  'findings.empty.description': {
    en: 'Create or promote results into findings to build an evidence trail.',
    fr: 'Créez des résultats ou promouvez des observations pour constituer une piste de preuves.',
  },

  'findings.modal.editTitle': { en: 'Edit finding', fr: 'Modifier le résultat' },
  'findings.modal.createTitle': { en: 'Add finding', fr: 'Ajouter un résultat' },
  'findings.modal.createSubmit': { en: 'Create finding', fr: 'Créer le résultat' },

  'findings.field.title': { en: 'Title', fr: 'Titre' },
  'findings.field.url': { en: 'URL', fr: 'URL' },
  'findings.field.discoveredAt': { en: 'Discovered at', fr: 'Date de découverte' },
  'findings.field.verifiedAt': { en: 'Verified at', fr: 'Date de vérification' },
  'findings.field.attributes': { en: 'Attributes JSON', fr: 'JSON des attributs' },

  'findings.category.account': { en: 'Account', fr: 'Compte' },
  'findings.category.data_broker': { en: 'Data broker', fr: 'Courtier en données' },
  'findings.category.breach': { en: 'Breach', fr: 'Fuite de données' },
  'findings.category.mention': { en: 'Mention', fr: 'Mention' },
  'findings.category.document': { en: 'Document', fr: 'Document' },
  'findings.category.domain': { en: 'Domain', fr: 'Domaine' },
  'findings.category.other': { en: 'Other', fr: 'Autre' },

  'findings.status.NEW': { en: 'New', fr: 'Nouveau' },
  'findings.status.SUGGESTED': { en: 'Suggested', fr: 'Suggéré' },
  'findings.status.CONFIRMED': { en: 'Confirmed', fr: 'Confirmé' },
  'findings.status.REJECTED': { en: 'Rejected', fr: 'Rejeté' },
  'findings.status.LATER': { en: 'Later', fr: 'Plus tard' },
  'findings.status.REAPPEARED': { en: 'Reappeared', fr: 'Réapparu' },
  'findings.status.REMOVED': { en: 'Removed', fr: 'Supprimé' },

  'findings.evidence.action': { en: 'Evidence', fr: 'Preuves' },
  'findings.evidence.title': { en: 'Evidence', fr: 'Preuves' },
  'findings.evidence.titleFor': { en: 'Evidence for {title}', fr: 'Preuves pour {title}' },
  'findings.evidence.loading': { en: 'Loading evidence…', fr: 'Chargement des preuves…' },
  'findings.evidence.empty': {
    en: 'No evidence records attached yet.',
    fr: 'Aucune preuve n’est encore associée.',
  },
  'findings.evidence.record': { en: 'Evidence record', fr: 'Élément de preuve' },
  'findings.evidence.captured': { en: 'Captured {date}', fr: 'Capturé le {date}' },
  'findings.evidence.screenshot': { en: 'Screenshot: {path}', fr: 'Capture d’écran : {path}' },
  'findings.evidence.html': { en: 'HTML capture: {path}', fr: 'Capture HTML : {path}' },

  'findings.toast.requiredFields': {
    en: 'Source and title are required',
    fr: 'La source et le titre sont obligatoires',
  },
  'findings.toast.created': { en: 'Finding created', fr: 'Résultat créé' },
  'findings.toast.updated': { en: 'Finding updated', fr: 'Résultat mis à jour' },
  'findings.toast.saveFailed': {
    en: 'Unable to save finding',
    fr: 'Impossible d’enregistrer le résultat',
  },
  'findings.toast.deleted': { en: 'Finding deleted', fr: 'Résultat supprimé' },
  'findings.toast.deleteFailed': {
    en: 'Unable to delete finding',
    fr: 'Impossible de supprimer le résultat',
  },

  'findings.delete.title': { en: 'Delete finding', fr: 'Supprimer le résultat' },
  'findings.delete.description': {
    en: 'Delete this finding and its frontend reference?',
    fr: 'Supprimer ce résultat et sa référence dans l’interface ?',
  },

  'findings.relationships.title': { en: 'Relationships', fr: 'Relations' },
  'findings.relationships.description': {
    en: 'Visualise linked entities and triage suggested matches.',
    fr: 'Visualisez les entités liées et triez les correspondances suggérées.',
  },
  'findings.relationships.descriptionExplore': {
    en: 'Explore linked entities and review queued correlation suggestions.',
    fr: 'Explorez les entités liées et examinez les suggestions de corrélation en attente.',
  },
  'findings.relationships.run': { en: 'Run correlation', fr: 'Lancer la corrélation' },
  'findings.relationships.loading': {
    en: 'Loading relationships…',
    fr: 'Chargement des relations…',
  },
  'findings.relationships.tab.graph': { en: 'Graph', fr: 'Graphe' },
  'findings.relationships.tab.review': { en: 'Review queue', fr: 'File d’examen' },

  'findings.relationships.graphCard.title': {
    en: 'Relationship graph',
    fr: 'Graphe des relations',
  },
  'findings.relationships.graphCard.description': {
    en: 'Simple force-directed view of the active identity and connected entities.',
    fr: 'Vue simple, à disposition dirigée par les forces, de l’identité active et des entités connectées.',
  },

  'findings.relationships.rules.title': { en: 'Correlation rules', fr: 'Règles de corrélation' },
  'findings.relationships.rules.description': {
    en: 'Method: {method} · max auto score {score}',
    fr: 'Méthode : {method} · score automatique maximal {score}',
  },
  'findings.relationships.rules.unknownMethod': { en: 'Unknown', fr: 'Inconnue' },


  // Rule identifiers stay untouched; only the wording shown to the operator
  // is localised, with the server-sent label kept as a runtime fallback.
  'findings.relationships.rule.same_email.label': { en: 'Same email address', fr: 'Même adresse e-mail' },
  'findings.relationships.rule.same_email.description': {
    en: 'The two entities expose the very same normalised email address.',
    fr: 'Les deux entités exposent exactement la même adresse e-mail normalisée.',
  },
  'findings.relationships.rule.same_phone.label': { en: 'Same phone number', fr: 'Même numéro de téléphone' },
  'findings.relationships.rule.same_phone.description': {
    en: 'The two entities expose the same phone number in E.164 form.',
    fr: 'Les deux entités exposent le même numéro de téléphone au format E.164.',
  },
  'findings.relationships.rule.explicit_link.label': { en: 'Explicit link between the two accounts', fr: 'Lien explicite entre les deux comptes' },
  'findings.relationships.rule.explicit_link.description': {
    en: 'One profile explicitly links to the other (declared cross-link).',
    fr: 'Un profil renvoie explicitement vers l’autre (lien croisé déclaré).',
  },
  'findings.relationships.rule.same_username.label': { en: 'Same exact username', fr: 'Pseudonyme strictement identique' },
  'findings.relationships.rule.same_username.description': {
    en: 'Identical normalised username on two different platforms.',
    fr: 'Pseudonyme normalisé identique sur deux plateformes différentes.',
  },
  'findings.relationships.rule.same_domain.label': { en: 'Same personal domain', fr: 'Même domaine personnel' },
  'findings.relationships.rule.same_domain.description': {
    en: 'Both entities reference the same personal domain or website.',
    fr: 'Les deux entités référencent le même domaine ou site web personnel.',
  },
  'findings.relationships.rule.same_avatar.label': { en: 'Identical avatar', fr: 'Avatar identique' },
  'findings.relationships.rule.same_avatar.description': {
    en: 'Identical image hash (SHA-256) or very close perceptual hash.',
    fr: 'Empreinte d’image identique (SHA-256) ou empreinte perceptuelle très proche.',
  },
  'findings.relationships.rule.same_name.label': { en: 'Identical display name', fr: 'Nom affiché identique' },
  'findings.relationships.rule.same_name.description': {
    en: 'Normalised display names are identical.',
    fr: 'Les noms affichés normalisés sont identiques.',
  },
  'findings.relationships.rule.similar_bio.label': { en: 'Similar biography', fr: 'Biographie similaire' },
  'findings.relationships.rule.similar_bio.description': {
    en: 'Biographies share a significant amount of rare tokens.',
    fr: 'Les biographies partagent un nombre significatif de termes rares.',
  },
  'findings.relationships.rule.similar_username.label': { en: 'Similar username', fr: 'Pseudonyme similaire' },
  'findings.relationships.rule.similar_username.description': {
    en: 'Usernames differ only by a short suffix, digits or separators.',
    fr: 'Les pseudonymes ne diffèrent que par un court suffixe, des chiffres ou des séparateurs.',
  },
  'findings.relationships.rule.same_company.label': { en: 'Same employer', fr: 'Même employeur' },
  'findings.relationships.rule.same_company.description': {
    en: 'Both entities mention the same company or professional domain.',
    fr: 'Les deux entités mentionnent la même entreprise ou le même domaine professionnel.',
  },
  'findings.relationships.rule.same_city.label': { en: 'Same declared city', fr: 'Même ville déclarée' },
  'findings.relationships.rule.same_city.description': {
    en: 'Both entities declare a city the operator has lived in.',
    fr: 'Les deux entités déclarent une ville où l’opérateur a vécu.',
  },
  'findings.relationships.rule.conflicting_country.label': { en: 'Conflicting country', fr: 'Pays contradictoire' },
  'findings.relationships.rule.conflicting_country.description': {
    en: 'The declared countries are mutually exclusive.',
    fr: 'Les pays déclarés sont mutuellement exclusifs.',
  },
  'findings.relationships.rule.conflicting_timeline.label': { en: 'Conflicting activity period', fr: 'Période d’activité contradictoire' },
  'findings.relationships.rule.conflicting_timeline.description': {
    en: 'Activity periods cannot overlap for a single person.',
    fr: 'Les périodes d’activité ne peuvent pas se chevaucher pour une même personne.',
  },

  'findings.relationships.review.emptyTitle': {
    en: 'Review queue is empty',
    fr: 'La file d’examen est vide',
  },
  'findings.relationships.review.emptyDescription': {
    en: 'Run correlation or wait for new suggested relationships.',
    fr: 'Lancez la corrélation ou attendez de nouvelles relations suggérées.',
  },
  'findings.relationships.review.questionPlatform': {
    en: 'Is this {platform} account yours?',
    fr: 'Ce compte {platform} vous appartient-il ?',
  },
  'findings.relationships.review.questionEntities': {
    en: 'Do ‘{source}’ and ‘{target}’ belong to you?',
    fr: '« {source} » et « {target} » vous appartiennent-ils ?',
  },
  'findings.relationships.review.score': { en: 'Score {score}', fr: 'Score {score}' },
  'findings.relationships.review.reason': { en: 'Reason: {reason}', fr: 'Raison : {reason}' },
  'findings.relationships.review.reasonNone': {
    en: 'No free-text reason provided.',
    fr: 'Aucune raison en texte libre n’a été fournie.',
  },
  'findings.relationships.review.breakdown': { en: 'Score breakdown', fr: 'Détail du score' },
  'findings.relationships.review.context': { en: 'Context', fr: 'Contexte' },

  'findings.relationships.action.reject': { en: 'Reject', fr: 'Rejeter' },
  'findings.relationships.action.later': { en: 'Later', fr: 'Plus tard' },

  'findings.relationships.status.UNKNOWN': { en: 'Unknown', fr: 'Inconnue' },
  'findings.relationships.status.SUGGESTED': { en: 'Suggested', fr: 'Suggérée' },
  'findings.relationships.status.CONFIRMED': { en: 'Confirmed', fr: 'Confirmée' },
  'findings.relationships.status.REJECTED': { en: 'Rejected', fr: 'Rejetée' },

  'findings.relationships.toast.runComplete': {
    en: 'Correlation run complete',
    fr: 'Corrélation terminée',
  },
  'findings.relationships.toast.runCompleteDetail': {
    en: 'Created {created}, updated {updated}.',
    fr: '{created} créée(s), {updated} mise(s) à jour.',
  },
  'findings.relationships.toast.runFailed': {
    en: 'Correlation run failed',
    fr: 'Échec de la corrélation',
  },
  'findings.relationships.toast.decisionFailed': {
    en: 'Unable to submit decision',
    fr: 'Impossible d’enregistrer la décision',
  },
  'findings.relationships.toast.markedConfirmed': {
    en: 'Marked as confirmed',
    fr: 'Marquée comme confirmée',
  },
  'findings.relationships.toast.markedRejected': {
    en: 'Marked as rejected',
    fr: 'Marquée comme rejetée',
  },
  'findings.relationships.toast.markedLater': {
    en: 'Marked as later',
    fr: 'Reportée à plus tard',
  },

  'findings.graph.ariaLabel': { en: 'Relationship graph', fr: 'Graphe des relations' },
  'findings.graph.description': {
    en: 'Interactive graph of the active identity and its connected entities.',
    fr: 'Graphe interactif de l’identité active et des entités qui lui sont connectées.',
  },
  'findings.graph.hint': {
    en: 'Click nodes to inspect. Drag the canvas to pan.',
    fr: 'Cliquez sur un nœud pour l’inspecter. Faites glisser le fond pour vous déplacer.',
  },
  'findings.graph.selected': {
    en: 'Selected: {label} ({type})',
    fr: 'Sélectionné : {label} ({type})',
  },
  'findings.graph.node.identity': { en: 'Identity', fr: 'Identité' },
  'findings.graph.node.email': { en: 'Email', fr: 'E-mail' },
  'findings.graph.node.phone': { en: 'Phone', fr: 'Téléphone' },
  'findings.graph.node.username': { en: 'Username', fr: 'Pseudonyme' },
  'findings.graph.node.name': { en: 'Name', fr: 'Nom' },
  'findings.graph.node.address': { en: 'Address', fr: 'Adresse' },
  'findings.graph.node.company': { en: 'Company', fr: 'Entreprise' },
  'findings.graph.node.domain': { en: 'Domain', fr: 'Domaine' },
  'findings.graph.node.profile': { en: 'Profile', fr: 'Profil' },
  'findings.graph.node.account': { en: 'Account', fr: 'Compte' },
  'findings.graph.node.finding': { en: 'Finding', fr: 'Résultat' },
  'findings.graph.node.data_broker': { en: 'Data broker', fr: 'Courtier en données' },
  'findings.graph.node.photo': { en: 'Photo', fr: 'Photo' },
  'findings.graph.node.identifier': { en: 'Identifier', fr: 'Identifiant' },

  'findings.ring.ariaLabel': { en: '{label}: {percent}%', fr: '{label} : {percent} %' },
  'findings.progress.ariaLabel': { en: 'Progress', fr: 'Progression' },
} as const satisfies MessageMap
