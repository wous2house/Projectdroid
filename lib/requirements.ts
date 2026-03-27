export const LEVEL2_GROUP = ['type_werken_bij', 'type_landing', 'type_corporate'];
export const LEVEL3_GROUP = ['cms_eigen', 'cms_wp'];

export const getIndentClass = (req: string) => {
  if (['type_werken_bij', 'type_landing', 'type_corporate', 'wp_rocket', 'wp_umbrella', 'wp_wordfence', 'wp_wordfence_premium'].includes(req)) return 'ml-8 md:ml-12';
  if (['cms_eigen', 'cms_wp'].includes(req)) return 'ml-16 md:ml-24';
  if (['eigen_recruitee', 'wp_elementor', 'wp_forms', 'wp_acf', 'wp_code', 'wp_jet', 'wp_smashballoon_pro', 'wp_api_to_posts'].includes(req)) return 'ml-24 md:ml-32';
  return '';
};
