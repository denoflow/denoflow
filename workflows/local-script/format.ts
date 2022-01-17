export default function (item: Record<string,string>) {  
  return {
    is_created_exists: item.created_at_i!==undefined
  }
}
