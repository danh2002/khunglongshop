const formatCategoryName = (categoryName: string) => {
  return categoryName.split("-").join(" ");
};

const convertCategoryNameToURLFriendly = (categoryName: string) => {
  return categoryName.split(" ").join("-");
};

export { formatCategoryName, convertCategoryNameToURLFriendly };
