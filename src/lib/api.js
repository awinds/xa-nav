export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.message || '请求失败');
  return json;
}

export function formatTags(tags) {
  if (!tags) return [];
  return tags.split(',').map((item) => item.trim()).filter(Boolean);
}

export function formatCategoryTree(categories) {
  const map = {};
  categories.forEach((category) => {
    map[category.id] = { ...category, children: [] };
  });
  const roots = [];
  categories.forEach((category) => {
    if (category.parentId && map[category.parentId]) {
      map[category.parentId].children.push(map[category.id]);
    } else {
      roots.push(map[category.id]);
    }
  });
  return roots;
}
